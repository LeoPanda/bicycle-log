from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel

class DashboardSummary(BaseModel):
    total_distance_km: float
    total_elevation_gain_m: float
    total_ride_count: int
    total_stay_spots: int

class RecentActivityItem(BaseModel):
    id: int
    name: str
    start_date: datetime
    bike_name: str
    distance_km: float
    elevation_gain: float

class SpotRankingItem(BaseModel):
    place_id: str
    place_name: str
    category_name: str
    visit_count: int
    last_visited_at: datetime

class RouteRankingItem(BaseModel):
    route_id: int
    name: str
    activity_count: int

class DashboardResponse(BaseModel):
    summary: DashboardSummary
    recent_activities: List[RecentActivityItem]
    ranking: List[SpotRankingItem]
    route_ranking: List[RouteRankingItem]

class MetricItem(BaseModel):
    period: str
    distance_km: float
    elevation_m: float
    moving_hours: float
    ride_count: int
    calories_kcal: float

class MetricsResponse(BaseModel):
    range_type: str
    metrics: List[MetricItem]

class HeatmapPolyline(BaseModel):
    activity_id: int
    name: str
    start_date: datetime
    distance_km: float
    polyline: str
    strava_url: str

class HeatmapRouteActivity(BaseModel):
    id: int
    name: str
    start_date: datetime
    distance_km: float

class HeatmapRoute(BaseModel):
    route_id: int
    name: str
    summary_polyline: str
    activity_count: int
    activities: List[HeatmapRouteActivity]

class HeatmapMarker(BaseModel):
    place_id: str
    name: str
    address: Optional[str] = None
    latitude: float
    longitude: float
    category_name: str
    category_icon: str
    visit_count: int

class HeatmapResponse(BaseModel):
    available_years: List[str]
    selected_year: str
    polylines: List[HeatmapPolyline]
    routes: List[HeatmapRoute]
    markers: List[HeatmapMarker]

class DistanceChartData(BaseModel):
    label: str
    distance: float
