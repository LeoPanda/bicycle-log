import logging
import math
from typing import List, Optional, Tuple

logger = logging.getLogger("app.services.polyline_utils")

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
    """Calculates great circle distance in meters using Haversine formula."""
    R = 6371000.0
    lat1, lon1 = math.radians(coord1[0]), math.radians(coord1[1])
    lat2, lon2 = math.radians(coord2[0]), math.radians(coord2[1])

    dlat = lat2 - lat1
    dlon = lon2 - lon1

    a = math.sin(dlat / 2.0)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2.0)**2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return R * c

def resample_points(points: List[Tuple[float, float]], sample_interval_m: float = 150.0) -> List[Tuple[float, float]]:
    """Resamples lat/lng points to approximately equal spacing in meters."""
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

def calculate_fast_similarity(
    pts1: List[Tuple[float, float]],
    pts2: List[Tuple[float, float]],
    distance_threshold_m: float = 150.0,
    min_similarity: float = 0.70,
) -> float:
    """
    Computes bidirectional matching ratio with early termination.
    Returns similarity between 0.0 and 1.0. If similarity is guaranteed < min_similarity,
    exits early to save CPU time.
    """
    if not pts1 or not pts2:
        return 0.0

    len1 = len(pts1)
    len2 = len(pts2)
    max_unmatched_1 = int(len1 * (1.0 - min_similarity))
    max_unmatched_2 = int(len2 * (1.0 - min_similarity))

    # Direction 1 -> 2
    unmatched_1 = 0
    matched_1 = 0
    for p1 in pts1:
        # Check closest in pts2
        is_matched = False
        for p2 in pts2:
            if haversine_distance(p1, p2) <= distance_threshold_m:
                is_matched = True
                break
        if is_matched:
            matched_1 += 1
        else:
            unmatched_1 += 1
            if unmatched_1 > max_unmatched_1:
                return 0.0  # Early exit

    ratio_1 = matched_1 / len1

    # Direction 2 -> 1
    unmatched_2 = 0
    matched_2 = 0
    for p2 in pts2:
        is_matched = False
        for p1 in pts1:
            if haversine_distance(p2, p1) <= distance_threshold_m:
                is_matched = True
                break
        if is_matched:
            matched_2 += 1
        else:
            unmatched_2 += 1
            if unmatched_2 > max_unmatched_2:
                return 0.0  # Early exit

    ratio_2 = matched_2 / len2
    return min(ratio_1, ratio_2)
