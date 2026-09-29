import math
import logging
from typing import List, Tuple, Dict, Set, Optional
from sqlmodel import Session, select
from app.models.activity import Activity
from app.models.route import Route

logger = logging.getLogger("app.services.route")

def decode_polyline(polyline_str: str) -> List[Tuple[float, float]]:
    """Decodes a Google Encoded Polyline string into a list of (latitude, longitude) tuples."""
    if not polyline_str:
        return []
    index = 0
    length = len(polyline_str)
    lat = 0
    lng = 0
    coordinates = []

    while index < length:
        # Decode latitude
        shift = 0
        result = 0
        while True:
            b = ord(polyline_str[index]) - 63
            index += 1
            result |= (b & 0x1f) << shift
            shift += 5
            if b < 0x20:
                break
        dlat = ~(result >> 1) if (result & 1) else (result >> 1)
        lat += dlat

        # Decode longitude
        shift = 0
        result = 0
        while True:
            b = ord(polyline_str[index]) - 63
            index += 1
            result |= (b & 0x1f) << shift
            shift += 5
            if b < 0x20:
                break
        dlng = ~(result >> 1) if (result & 1) else (result >> 1)
        lng += dlng

        coordinates.append((lat / 1e5, lng / 1e5))

    return coordinates

def haversine_distance(coord1: Tuple[float, float], coord2: Tuple[float, float]) -> float:
    """Calculates the great circle distance between two points in meters using Haversine formula."""
    R = 6371000.0  # Earth radius in meters
    lat1, lon1 = math.radians(coord1[0]), math.radians(coord1[1])
    lat2, lon2 = math.radians(coord2[0]), math.radians(coord2[1])

    dlat = lat2 - lat1
    dlon = lon2 - lon1

    a = math.sin(dlat / 2.0)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2.0)**2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return R * c

def _resample_points(points: List[Tuple[float, float]], sample_interval_m: float = 100.0) -> List[Tuple[float, float]]:
    """Resamples a list of lat/lng points to have approximately equal spacing in meters."""
    if not points:
        return []
    if len(points) == 1:
        return points

    resampled = [points[0]]
    accumulated_dist = 0.0

    for i in range(1, len(points)):
        p1 = points[i - 1]
        p2 = points[i]
        segment_dist = haversine_distance(p1, p2)
        if segment_dist == 0:
            continue

        accumulated_dist += segment_dist
        if accumulated_dist >= sample_interval_m:
            resampled.append(p2)
            accumulated_dist = 0.0

    if resampled[-1] != points[-1]:
        resampled.append(points[-1])

    return resampled

def calculate_polyline_similarity(
    polyline1: str,
    polyline2: str,
    distance_threshold_m: float = 150.0,
    label1: str = "Poly1",
    label2: str = "Poly2"
) -> float:
    """
    Calculates similarity between two encoded polylines (range 0.0 to 1.0).
    Logs comparison details including sample point counts, directional coverage ratios, and final similarity score.
    """
    if not polyline1 or not polyline2:
        logger.info(f"[Polyline Sim] {label1} vs {label2} => Empty polyline provided (Sim: 0.0%)")
        return 0.0

    if polyline1 == polyline2:
        logger.info(f"[Polyline Sim] {label1} vs {label2} => Exact polyline match string (Sim: 100.0%)")
        return 1.0

    pts1_raw = decode_polyline(polyline1)
    pts2_raw = decode_polyline(polyline2)

    if not pts1_raw or not pts2_raw:
        logger.info(f"[Polyline Sim] {label1} vs {label2} => Decoded 0 points (Sim: 0.0%)")
        return 0.0

    # Bounding box filter check (~5.5km tolerance)
    lats1 = [p[0] for p in pts1_raw]
    lngs1 = [p[1] for p in pts1_raw]
    lats2 = [p[0] for p in pts2_raw]
    lngs2 = [p[1] for p in pts2_raw]

    if (max(lats1) < min(lats2) - 0.05 or min(lats1) > max(lats2) + 0.05 or
        max(lngs1) < min(lngs2) - 0.05 or min(lngs1) > max(lngs2) + 0.05):
        logger.info(f"[Polyline Sim] [{label1}] vs [{label2}] => Bounding box miss (Sim: 0.0%)")
        return 0.0

    pts1 = _resample_points(pts1_raw, sample_interval_m=150.0)
    pts2 = _resample_points(pts2_raw, sample_interval_m=150.0)

    # Direction-independent point matching:
    # Compute matching ratio for pts1 -> pts2
    matched_count_1 = 0
    for p1 in pts1:
        min_d = min(haversine_distance(p1, p2) for p2 in pts2)
        if min_d <= distance_threshold_m:
            matched_count_1 += 1
    ratio_1 = matched_count_1 / len(pts1) if pts1 else 0.0

    # Compute matching ratio for pts2 -> pts1
    matched_count_2 = 0
    for p2 in pts2:
        min_d = min(haversine_distance(p2, p1) for p1 in pts1)
        if min_d <= distance_threshold_m:
            matched_count_2 += 1
    ratio_2 = matched_count_2 / len(pts2) if pts2 else 0.0

    # Similarity is the minimum of both coverage ratios
    similarity = min(ratio_1, ratio_2)

    logger.info(
        f"[Polyline Sim] [{label1}] vs [{label2}] => "
        f"Raw Pts: ({len(pts1_raw)} vs {len(pts2_raw)}), "
        f"Resampled Pts: ({len(pts1)} vs {len(pts2)}), "
        f"Coverage 1->2: {ratio_1 * 100:.1f}%, Coverage 2->1: {ratio_2 * 100:.1f}%, "
        f"Final Similarity: {similarity * 100:.1f}%"
    )

    return similarity

def detect_and_group_routes(session: Session) -> Dict[str, int]:
    """
    Scans all activities with summary_polyline, calculates similarity,
    groups activities with > 70% similarity into Route master entries,
    and updates activity.route_id links. Outputs detailed logging for debugging.
    """
    activities = session.exec(
        select(Activity).where(Activity.summary_polyline != None)  # noqa
    ).all()

    logger.info(f"[Route Detection] Starting route detection scan for {len(activities)} activities...")

    if not activities:
        logger.info("[Route Detection] No activities with summary_polyline found.")
        return {"detected_routes": 0, "grouped_activities": 0}

    n = len(activities)
    # Adjacency list for graph components where similarity > 0.70
    adj: Dict[int, Set[int]] = {act.id: set() for act in activities}
    poly_cache = {act.id: act.summary_polyline for act in activities}

    comparison_count = 0
    match_count = 0

    for i in range(n):
        act_i = activities[i]
        label_i = f"Act #{act_i.id} ('{act_i.name}')"
        for j in range(i + 1, n):
            act_j = activities[j]
            label_j = f"Act #{act_j.id} ('{act_j.name}')"

            comparison_count += 1
            sim = calculate_polyline_similarity(
                poly_cache[act_i.id],
                poly_cache[act_j.id],
                label1=label_i,
                label2=label_j
            )

            if sim > 0.70:
                match_count += 1
                logger.info(f"[Route Detection] ==> MATCH FOUND (>70%): {label_i} <-> {label_j} (Sim: {sim * 100:.1f}%)")
                adj[act_i.id].add(act_j.id)
                adj[act_j.id].add(act_i.id)
            else:
                logger.info(f"[Route Detection] NO MATCH (<=70%): {label_i} <-> {label_j} (Sim: {sim * 100:.1f}%)")

    logger.info(f"[Route Detection] Completed {comparison_count} pairwise comparisons. Found {match_count} matching pairs (>70%).")

    # Find connected components with size >= 2
    visited: Set[int] = set()
    clusters: List[List[int]] = []

    for act in activities:
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

    logger.info(f"[Route Detection] Identified {len(clusters)} route clusters containing >= 2 activities.")

    act_map = {act.id: act for act in activities}
    grouped_activity_count = 0
    created_route_count = 0

    # Map activities to existing or new routes
    for idx, cluster in enumerate(clusters, start=1):
        cluster_acts = [act_map[aid] for aid in cluster]
        logger.info(f"[Route Detection] Processing Cluster #{idx}: Activities = {[a.id for a in cluster_acts]}")

        # Check if any activity in cluster is already assigned to a route
        existing_route_ids = set(act.route_id for act in cluster_acts if act.route_id is not None)
        target_route: Optional[Route] = None

        if existing_route_ids:
            first_route_id = list(existing_route_ids)[0]
            target_route = session.get(Route, first_route_id)
            logger.info(f"[Route Detection] Reusing existing Route #{target_route.id} ('{target_route.name}') for Cluster #{idx}")

        if not target_route:
            # Create new Route master
            routes_count = len(session.exec(select(Route)).all())
            route_name = f"定番ルート #{routes_count + 1}"

            # Use summary_polyline of the latest activity in cluster
            sorted_cluster = sorted(cluster_acts, key=lambda a: a.start_date, reverse=True)
            rep_polyline = sorted_cluster[0].summary_polyline

            target_route = Route(
                name=route_name,
                summary_polyline=rep_polyline
            )
            session.add(target_route)
            session.commit()
            session.refresh(target_route)
            created_route_count += 1
            logger.info(f"[Route Detection] Created new Route #{target_route.id} ('{target_route.name}') for Cluster #{idx}")

        # Link all activities in cluster to target_route
        for act in cluster_acts:
            if act.route_id != target_route.id:
                act.route_id = target_route.id
                session.add(act)
                grouped_activity_count += 1
                logger.info(f"[Route Detection] Linked Activity #{act.id} ('{act.name}') -> Route #{target_route.id}")

    session.commit()

    # Clean up empty or single-activity routes if any
    all_routes = session.exec(select(Route)).all()
    for route in all_routes:
        linked_acts = session.exec(select(Activity).where(Activity.route_id == route.id)).all()
        if len(linked_acts) < 2:
            logger.info(f"[Route Detection] Cleaning up orphan Route #{route.id} ('{route.name}') with {len(linked_acts)} activities")
            for act in linked_acts:
                act.route_id = None
                session.add(act)
            session.delete(route)
    session.commit()

    logger.info(
        f"[Route Detection] Route detection summary: "
        f"Created {created_route_count} new routes, "
        f"Grouped/Updated {grouped_activity_count} activities."
    )

    return {
        "detected_routes": created_route_count,
        "grouped_activities": grouped_activity_count
    }
