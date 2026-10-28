import logging
from datetime import datetime
from typing import Any, Dict, List, Optional, Set, Tuple, TypedDict

from fastapi import HTTPException, status
from sqlmodel import Session, select

from app.models.activity import Activity
from app.models.route import Route
from app.schemas.route import RouteUpdate
from app.services.polyline_utils import (
    calculate_fast_similarity,
    decode_polyline,
    resample_points,
)


class PrecomputedActivity(TypedDict):
    pts: List[Tuple[float, float]]
    min_lat: float
    max_lat: float
    min_lng: float
    max_lng: float
    distance: float
    start_pt: Tuple[float, float]
    end_pt: Tuple[float, float]

logger = logging.getLogger("app.services.route")

def calculate_polyline_similarity(
    polyline1: str,
    polyline2: str,
    distance_threshold_m: float = 150.0,
    label1: str = "Poly1",
    label2: str = "Poly2",
) -> float:
    """Calculates similarity between two polylines using resampled points."""
    if not polyline1 or not polyline2:
        return 0.0
    if polyline1 == polyline2:
        return 1.0

    raw1 = decode_polyline(polyline1)
    raw2 = decode_polyline(polyline2)
    if not raw1 or not raw2:
        return 0.0

    pts1 = resample_points(raw1, sample_interval_m=150.0)
    pts2 = resample_points(raw2, sample_interval_m=150.0)
    return calculate_fast_similarity(pts1, pts2, distance_threshold_m=distance_threshold_m, min_similarity=0.70)


def detect_and_group_routes(session: Session) -> Dict[str, int]:
    """
    Optimized route detection using distance ratio pruning, bounding-box checks,
    pre-resampled point caching, and early-termination similarity calculation.
    """
    activities = session.exec(
        select(Activity).where(Activity.summary_polyline != None)  # noqa
    ).all()

    logger.info(f"[Route Detection] Starting optimized scan for {len(activities)} activities...")
    if not activities:
        return {"detected_routes": 0, "grouped_activities": 0}

    # 1. Precompute metadata and resampled points
    precomputed: Dict[int, PrecomputedActivity] = {}
    for act in activities:
        if act.id is None:
            continue
        raw_pts = decode_polyline(act.summary_polyline)
        if not raw_pts:
            continue
        pts = resample_points(raw_pts, sample_interval_m=150.0)
        lats = [p[0] for p in raw_pts]
        lngs = [p[1] for p in raw_pts]
        precomputed[act.id] = {
            "pts": pts,
            "min_lat": min(lats),
            "max_lat": max(lats),
            "min_lng": min(lngs),
            "max_lng": max(lngs),
            "distance": act.distance or 0.0,
            "start_pt": raw_pts[0],
            "end_pt": raw_pts[-1],
        }

    valid_acts = [act for act in activities if act.id in precomputed and len(precomputed[act.id]["pts"]) >= 3]
    n = len(valid_acts)
    adj: Dict[int, Set[int]] = {act.id: set() for act in valid_acts}

    comparison_count = 0
    match_count = 0
    skipped_distance = 0
    skipped_bbox = 0

    # 2. Pairwise comparison with pruning
    for i in range(n):
        act_i = valid_acts[i]
        meta_i = precomputed[act_i.id]
        dist_i = meta_i["distance"]

        for j in range(i + 1, n):
            act_j = valid_acts[j]
            meta_j = precomputed[act_j.id]
            dist_j = meta_j["distance"]

            # Pruning 1: Distance ratio check (> 30% difference cannot exceed 70% similarity)
            if dist_i > 0 and dist_j > 0:
                ratio = min(dist_i, dist_j) / max(dist_i, dist_j)
                if ratio < 0.68:
                    skipped_distance += 1
                    continue

            # Pruning 2: Bounding box overlap (~5km buffer)
            if (meta_i["max_lat"] < meta_j["min_lat"] - 0.05 or
                meta_i["min_lat"] > meta_j["max_lat"] + 0.05 or
                meta_i["max_lng"] < meta_j["min_lng"] - 0.05 or
                meta_i["min_lng"] > meta_j["max_lng"] + 0.05):
                skipped_bbox += 1
                continue

            comparison_count += 1
            sim = calculate_fast_similarity(
                meta_i["pts"],
                meta_j["pts"],
                distance_threshold_m=150.0,
                min_similarity=0.70
            )

            if sim > 0.70:
                match_count += 1
                adj[act_i.id].add(act_j.id)
                adj[act_j.id].add(act_i.id)

    logger.info(
        f"[Route Detection] Pruning stats: Skipped by dist: {skipped_distance}, "
        f"Skipped by bbox: {skipped_bbox}, Compared: {comparison_count}, Matches: {match_count}"
    )

    # 3. Graph clustering (connected components with >= 2 activities)
    visited: Set[int] = set()
    clusters: List[List[int]] = []

    for act in valid_acts:
        if act.id not in visited:
            component = []
            queue = [act.id]
            visited.add(act.id)
            while queue:
                curr = queue.pop(0)
                component.append(curr)
                for neighbor in adj[curr]:
                    if neighbor not in visited:
                        visited.add(neighbor)
                        queue.append(neighbor)
            if len(component) >= 2:
                clusters.append(component)

    logger.info(f"[Route Detection] Found {len(clusters)} route clusters with >= 2 activities.")

    act_map = {act.id: act for act in valid_acts}
    grouped_activity_count = 0
    created_route_count = 0

    for cluster in clusters:
        cluster_acts = [act_map[aid] for aid in cluster]
        existing_route_ids = set(act.route_id for act in cluster_acts if act.route_id is not None)
        target_route: Optional[Route] = None

        if existing_route_ids:
            first_route_id = list(existing_route_ids)[0]
            target_route = session.get(Route, first_route_id)

        if not target_route:
            routes_count = len(session.exec(select(Route)).all())
            route_name = f"定番ルート #{routes_count + 1}"
            sorted_cluster = sorted(cluster_acts, key=lambda a: a.start_date, reverse=True)
            target_route = Route(name=route_name, summary_polyline=sorted_cluster[0].summary_polyline)
            session.add(target_route)
            session.commit()
            session.refresh(target_route)
            created_route_count += 1

        for act in cluster_acts:
            if act.route_id != target_route.id:
                act.route_id = target_route.id
                session.add(act)
                grouped_activity_count += 1

    session.commit()

    # Clean up single-activity or orphan routes
    all_routes = session.exec(select(Route)).all()
    for route in all_routes:
        linked_acts = session.exec(select(Activity).where(Activity.route_id == route.id)).all()
        if len(linked_acts) < 2:
            for act in linked_acts:
                act.route_id = None
                session.add(act)
            session.delete(route)
    session.commit()

    logger.info(f"[Route Detection] Finished: created {created_route_count} routes, updated {grouped_activity_count} activities.")
    return {
        "detected_routes": created_route_count,
        "grouped_activities": grouped_activity_count
    }


def list_routes_data(session: Session) -> List[Dict[str, Any]]:
    routes = session.exec(select(Route).order_by(Route.id.asc())).all()
    result = []
    for r in routes:
        linked_activities = session.exec(
            select(Activity).where(Activity.route_id == r.id).order_by(Activity.start_date.desc())
        ).all()
        result.append({
            "id": r.id,
            "name": r.name,
            "summary_polyline": r.summary_polyline,
            "activity_count": len(linked_activities),
            "created_at": r.created_at,
            "updated_at": r.updated_at
        })
    return result


def get_route_detail_data(session: Session, route_id: int) -> Dict[str, Any]:
    route = session.get(Route, route_id)
    if not route:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Route not found")

    linked_activities = session.exec(
        select(Activity).where(Activity.route_id == route_id).order_by(Activity.start_date.desc())
    ).all()

    activities_list = []
    for a in linked_activities:
        activities_list.append({
            "id": a.id,
            "name": a.name,
            "start_date": a.start_date,
            "distance_km": round(a.distance / 1000.0, 2) if a.distance else 0.0,
            "moving_time": a.moving_time,
            "total_elevation_gain": a.total_elevation_gain,
            "summary_polyline": a.summary_polyline,
            "strava_url": f"https://www.strava.com/activities/{a.id}"
        })

    return {
        "id": route.id,
        "name": route.name,
        "summary_polyline": route.summary_polyline,
        "activity_count": len(linked_activities),
        "activities": activities_list,
        "created_at": route.created_at,
        "updated_at": route.updated_at
    }


def update_route_data(session: Session, route_id: int, route_update: RouteUpdate) -> Route:
    route = session.get(Route, route_id)
    if not route:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Route not found")

    if route_update.name is not None:
        route.name = route_update.name
    if route_update.summary_polyline is not None:
        route.summary_polyline = route_update.summary_polyline

    route.updated_at = datetime.now()
    session.add(route)
    session.commit()
    session.refresh(route)
    return route


def delete_route_data(session: Session, route_id: int) -> None:
    route = session.get(Route, route_id)
    if not route:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Route not found")

    linked_activities = session.exec(select(Activity).where(Activity.route_id == route_id)).all()
    for a in linked_activities:
        a.route_id = None
        session.add(a)

    session.delete(route)
    session.commit()
