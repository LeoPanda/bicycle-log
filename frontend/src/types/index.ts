export interface Bike {
  id: number;
  bike_code: string;
  name: string;
  brand?: string;
  model?: string;
  registered_at?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface PlaceCategory {
  id: number;
  name: string;
  description?: string;
  icon?: string;
  created_at: string;
  updated_at: string;
}

export interface Place {
  id: string;
  name: string;
  category_id?: number;
  category_name?: string;
  category_icon?: string;
  address?: string;
  latitude: number;
  longitude: number;
  visit_count?: number;
  created_at: string;
  updated_at: string;
}

export interface Activity {
  id: number;
  name: string;
  bike_id?: number;
  bike_name?: string;
  start_date: string;
  distance: number;
  moving_time?: number;
  elapsed_time?: number;
  total_elevation_gain: number;
  calories?: number;
  summary_polyline?: string;
  stay_count?: number;
  created_at: string;
  updated_at: string;
}

export interface StayLogImage {
  id: number;
  stay_log_id: number;
  image_url: string;
  comment?: string;
  display_order: number;
  created_at: string;
}

export interface StayLog {
  id: number;
  activity_id: number;
  place_id: string;
  place_name?: string;
  place_address?: string;
  activity_name?: string;
  arrived_at: string;
  left_at: string;
  stay_duration_seconds: number;
  stay_latitude: number;
  stay_longitude: number;
  notes?: string;
  images?: StayLogImage[];
  place?: Place;
  created_at: string;
}

export interface Tag {
  id: number;
  name: string;
  created_at: string;
}

export interface DashboardSummary {
  summary: {
    total_distance_km: number;
    total_elevation_gain_m: number;
    total_ride_count: number;
    total_stay_spots: number;
  };
  recent_activities: Array<{
    id: number;
    name: string;
    start_date: string;
    bike_name: string;
    distance_km: number;
    elevation_gain: number;
  }>;
  ranking: Array<{
    place_id: string;
    place_name: string;
    category_name: string;
    visit_count: number;
    last_visited_at: string;
  }>;
}

export interface AnalyticsMetric {
  period: string;
  distance_km: number;
  elevation_m: number;
  moving_hours: number;
  ride_count: number;
  calories_kcal: number;
}
