import math
from datetime import datetime, timedelta
from typing import List, Dict, Any, Tuple

def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Compute distance in meters between two lat/lng coordinates using Haversine formula."""
    R = 6371000.0  # Earth radius in meters
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = math.sin(delta_phi / 2.0)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0)**2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return R * c

def detect_stops(
    latlng_stream: List[List[float]],
    time_stream: List[int],
    start_date: datetime,
    min_stay_seconds: int = 1800,
    radius_meters: float = 50.0
) -> List[Dict[str, Any]]:
    """
    Detect stops from Strava Activity Streams (latlng and time).
    
    Returns a list of detected stops:
    [
        {
            "arrived_at": datetime,
            "left_at": datetime,
            "stay_duration_seconds": int,
            "stay_latitude": float,
            "stay_longitude": float
        },
        ...
    ]
    """
    if not latlng_stream or not time_stream or len(latlng_stream) != len(time_stream):
        return []

    stops = []
    n = len(latlng_stream)
    i = 0

    while i < n:
        start_pt = latlng_stream[i]
        start_t = time_stream[i]
        
        j = i + 1
        cluster_lats = [start_pt[0]]
        cluster_lngs = [start_pt[1]]

        while j < n:
            curr_pt = latlng_stream[j]
            # Check distance from the initial cluster center / start_pt
            center_lat = sum(cluster_lats) / len(cluster_lats)
            center_lng = sum(cluster_lngs) / len(cluster_lngs)
            
            dist = haversine_distance(center_lat, center_lng, curr_pt[0], curr_pt[1])
            if dist <= radius_meters:
                cluster_lats.append(curr_pt[0])
                cluster_lngs.append(curr_pt[1])
                j += 1
            else:
                break

        duration = time_stream[j - 1] - start_t
        if duration >= min_stay_seconds:
            centroid_lat = sum(cluster_lats) / len(cluster_lats)
            centroid_lng = sum(cluster_lngs) / len(cluster_lngs)
            
            arrived_at = start_date + timedelta(seconds=start_t)
            left_at = start_date + timedelta(seconds=time_stream[j - 1])

            stops.append({
                "arrived_at": arrived_at,
                "left_at": left_at,
                "stay_duration_seconds": duration,
                "stay_latitude": round(centroid_lat, 6),
                "stay_longitude": round(centroid_lng, 6)
            })
            i = j
        else:
            i += 1

    return stops
