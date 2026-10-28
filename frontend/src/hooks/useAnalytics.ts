import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { AnalyticsMetric, Bike } from '../types';

export type MetricTab = 'distance' | 'elevation' | 'time' | 'rides' | 'calories';

export interface HeatmapPolyline {
  activity_id: number;
  name: string;
  start_date: string;
  distance_km?: number;
  polyline: string;
  strava_url: string;
}

export interface HeatmapRoute {
  route_id: number;
  name: string;
  summary_polyline: string;
  activity_count: number;
  activities: Array<{
    id: number;
    name: string;
    start_date: string;
    distance_km: number;
  }>;
}

export interface HeatmapMarker {
  place_id: string;
  name: string;
  address?: string;
  latitude: number;
  longitude: number;
  category_name?: string;
  category_icon?: string;
  visit_count: number;
}

export function useAnalytics() {
  const [rangeType, setRangeType] = useState<'annual' | 'monthly' | 'weekly'>('annual');
  const [bikeId, setBikeId] = useState<string>('');
  const [selectedMetricTab, setSelectedMetricTab] = useState<MetricTab>('distance');

  const [metrics, setMetrics] = useState<AnalyticsMetric[]>([]);
  const [bikes, setBikes] = useState<Bike[]>([]);
  const [availableYears, setAvailableYears] = useState<string[]>([]);
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [heatmapData, setHeatmapData] = useState<{
    polylines: HeatmapPolyline[];
    routes: HeatmapRoute[];
    markers: HeatmapMarker[];
  }>({
    polylines: [],
    routes: [],
    markers: [],
  });

  const [selectedPolyline, setSelectedPolyline] = useState<HeatmapPolyline | null>(null);
  const [selectedRoute, setSelectedRoute] = useState<HeatmapRoute | null>(null);
  const [selectedMarker, setSelectedMarker] = useState<HeatmapMarker | null>(null);
  const [showSpots, setShowSpots] = useState(true);
  const [isGrayscale, setIsGrayscale] = useState(true);
  const [isFullscreenMap, setIsFullscreenMap] = useState(false);
  const [loadingMetrics, setLoadingMetrics] = useState(false);
  const [loadingHeatmap, setLoadingHeatmap] = useState(false);

  useEffect(() => {
    api.get<Bike[]>('/bikes').then(setBikes).catch(console.error);
  }, []);

  const fetchMetrics = async () => {
    setLoadingMetrics(true);
    try {
      const query = new URLSearchParams({
        range_type: rangeType,
        ...(bikeId ? { bike_id: bikeId } : {})
      });
      const res: any = await api.get(`/analytics/metrics?${query.toString()}`);
      setMetrics(res.metrics || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMetrics(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, [rangeType, bikeId]);

  const fetchHeatmap = async (targetYear?: string) => {
    setLoadingHeatmap(true);
    try {
      const query = new URLSearchParams();
      if (targetYear) {
        query.set('year', targetYear);
      }
      const res: any = await api.get(`/analytics/heatmap?${query.toString()}`);
      setAvailableYears(res.available_years || []);
      setSelectedYear(res.selected_year || '');
      setHeatmapData({
        polylines: res.polylines || [],
        routes: res.routes || [],
        markers: res.markers || []
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingHeatmap(false);
    }
  };

  useEffect(() => {
    fetchHeatmap(selectedYear || undefined);
  }, []);

  const handleYearChange = (year: string) => {
    setSelectedYear(year);
    fetchHeatmap(year);
  };

  return {
    rangeType,
    setRangeType,
    bikeId,
    setBikeId,
    selectedMetricTab,
    setSelectedMetricTab,
    metrics,
    bikes,
    availableYears,
    selectedYear,
    heatmapData,
    selectedPolyline,
    setSelectedPolyline,
    selectedRoute,
    setSelectedRoute,
    selectedMarker,
    setSelectedMarker,
    showSpots,
    setShowSpots,
    isGrayscale,
    setIsGrayscale,
    isFullscreenMap,
    setIsFullscreenMap,
    loadingMetrics,
    loadingHeatmap,
    handleYearChange,
  };
}
