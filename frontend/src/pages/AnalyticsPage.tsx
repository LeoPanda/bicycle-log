import React, { useEffect, useState, useMemo, useRef } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  BarChart2, Calendar, MapPin, ExternalLink, RefreshCw, Activity as ActivityIcon,
  Mountain, Clock, Trophy, Flame, ChevronRight, Filter,
  Coffee, Store, Utensils, ShoppingBag, Landmark, Camera, Beer, Fuel, Navigation as RouteIcon,
  Hotel, Trees, Film, Church, Train
} from 'lucide-react';
import L from 'leaflet';
import { api } from '../services/api';
import { AnalyticsMetric, Bike } from '../types';
import { decodePolyline } from '../utils/polyline';
import { RouteDetailModal } from '../components/RouteDetailModal';

const CATEGORY_ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  hotel: Hotel,
  coffee: Coffee,
  utensils: Utensils,
  store: Store,
  trees: Trees,
  film: Film,
  landmark: Landmark,
  church: Church,
  train: Train,
  'shopping-bag': ShoppingBag,
  camera: Camera,
  beer: Beer,
  fuel: Fuel,
  mountain: Mountain,
  'map-pin': MapPin,
};

type MetricTab = 'distance' | 'elevation' | 'time' | 'rides' | 'calories';

interface HeatmapPolyline {
  activity_id: number;
  name: string;
  start_date: string;
  distance_km?: number;
  polyline: string;
  strava_url: string;
}

interface HeatmapRoute {
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

interface HeatmapMarker {
  place_id: string;
  name: string;
  address?: string;
  latitude: number;
  longitude: number;
  category_name?: string;
  category_icon?: string;
  visit_count: number;
}

export const AnalyticsPage: React.FC = () => {
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
  const [loadingMetrics, setLoadingMetrics] = useState(false);
  const [loadingHeatmap, setLoadingHeatmap] = useState(false);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const prevFitKeyRef = useRef<string>('');

  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const routeIdParam = searchParams.get('route_id');
  const modalRouteId = routeIdParam && !isNaN(parseInt(routeIdParam, 10)) ? parseInt(routeIdParam, 10) : null;

  const handleOpenRouteModal = (routeId: number) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('route_id', routeId.toString());
    setSearchParams(newParams);
  };

  const handleCloseRouteModal = () => {
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('route_id');
    setSearchParams(newParams, { replace: true });
  };

  const fetchHeatmapData = (yearParam?: string) => {
    setLoadingHeatmap(true);
    const query = yearParam ? `?year=${yearParam}` : '';
    api.get<{
      available_years: string[];
      selected_year: string;
      polylines: HeatmapPolyline[];
      routes: HeatmapRoute[];
      markers: HeatmapMarker[];
    }>(`/analytics/heatmap${query}`)
      .then((res) => {
        setHeatmapData({
          polylines: res.polylines || [],
          routes: res.routes || [],
          markers: res.markers || [],
        });
        if (res.available_years) setAvailableYears(res.available_years);
        if (res.selected_year) setSelectedYear(res.selected_year);
      })
      .catch(console.error)
      .finally(() => setLoadingHeatmap(false));
  };

  useEffect(() => {
    api.get<Bike[]>('/bikes').then(setBikes).catch(console.error);
    fetchHeatmapData();
  }, []);

  const fetchMetrics = async () => {
    setLoadingMetrics(true);
    try {
      const query = new URLSearchParams({
        range_type: rangeType,
        ...(bikeId ? { bike_id: bikeId } : {}),
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

  // Sort polylines by date
  const sortedPolylines = useMemo(() => {
    return [...(heatmapData.polylines || [])].sort(
      (a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime()
    );
  }, [heatmapData.polylines]);

  // Decode single activity polylines into lat/lng arrays
  const decodedPolylines = useMemo(() => {
    return sortedPolylines.map((item) => ({
      ...item,
      coords: decodePolyline(item.polyline),
    }));
  }, [sortedPolylines]);

  // Decode master route polylines into lat/lng arrays
  const decodedMasterRoutes = useMemo(() => {
    return (heatmapData.routes || []).map((r) => ({
      ...r,
      coords: decodePolyline(r.summary_polyline),
    }));
  }, [heatmapData.routes]);

  // Initialize Leaflet map instance once
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      if ((mapContainerRef.current as any)._leaflet_id) {
        (mapContainerRef.current as any)._leaflet_id = null;
      }
      const map = L.map(mapContainerRef.current).setView([35.6812, 139.7671], 11);
      const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        className: isGrayscale ? 'map-tiles-grayscale' : '',
      }).addTo(map);
      tileLayerRef.current = tileLayer;

      const layerGroup = L.layerGroup().addTo(map);
      layerGroupRef.current = layerGroup;
      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        layerGroupRef.current = null;
        tileLayerRef.current = null;
      }
      if (mapContainerRef.current) {
        (mapContainerRef.current as any)._leaflet_id = null;
      }
    };
  }, []);

  // Sync grayscale tile class when isGrayscale state changes
  useEffect(() => {
    if (!tileLayerRef.current) return;
    const container = tileLayerRef.current.getContainer();
    if (container) {
      if (isGrayscale) {
        container.classList.add('map-tiles-grayscale');
      } else {
        container.classList.remove('map-tiles-grayscale');
      }
    }
  }, [isGrayscale]);

  // Update map layers on data change
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layerGroup = layerGroupRef.current;
    if (!map || !layerGroup) return;

    layerGroup.clearLayers();

    const allPoints: [number, number][] = [];

    // 1. Render Master Routes (Regular Routes)
    decodedMasterRoutes.forEach((route) => {
      if (route.coords.length < 2) return;
      const isSelected = selectedRoute?.route_id === route.route_id;

      const polyline = L.polyline(route.coords, {
        color: isSelected ? '#2563eb' : '#7c3aed',
        weight: isSelected ? 6 : 4,
        opacity: isSelected ? 0.95 : 0.7,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(layerGroup);

      polyline.bindTooltip(`定番ルート: ${route.name} (走行回数 ${route.activity_count} 回)`, {
        permanent: false,
        direction: 'top',
      });

      polyline.on('click', () => {
        setSelectedRoute(route);
        setSelectedPolyline(null);
        setSelectedMarker(null);
      });

      allPoints.push(...route.coords);
    });

    // 2. Render Single Unlinked Polylines
    decodedPolylines.forEach((route) => {
      if (route.coords.length < 2) return;
      const isSelected = selectedPolyline?.activity_id === route.activity_id;
      if (isSelected) return;

      const polyline = L.polyline(route.coords, {
        color: '#f43f5e',
        weight: 3,
        opacity: 0.5,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(layerGroup);

      polyline.on('click', () => {
        setSelectedPolyline(route);
        setSelectedRoute(null);
        setSelectedMarker(null);
      });

      allPoints.push(...route.coords);
    });

    // 3. Render Selected Single Polyline prominently on top
    if (selectedPolyline) {
      const selectedRouteObj = decodedPolylines.find((r) => r.activity_id === selectedPolyline.activity_id);
      if (selectedRouteObj && selectedRouteObj.coords.length >= 2) {
        const selPolyline = L.polyline(selectedRouteObj.coords, {
          color: '#0284c7',
          weight: 5,
          opacity: 0.95,
          lineCap: 'round',
          lineJoin: 'round',
        }).addTo(layerGroup);

        selPolyline.on('click', () => {
          setSelectedPolyline(selectedRouteObj);
          setSelectedRoute(null);
          setSelectedMarker(null);
        });

        allPoints.push(...selectedRouteObj.coords);
      }
    }

    // Render spot markers with category icons if showSpots is enabled
    if (showSpots) {
      heatmapData.markers.forEach((m) => {
        if (m.latitude && m.longitude) {
          const pt: [number, number] = [m.latitude, m.longitude];
          const isSelected = selectedMarker?.place_id === m.place_id;

          const IconComp = CATEGORY_ICON_MAP[m.category_icon || ''] || MapPin;
          const iconHtml = renderToStaticMarkup(
            <div
              className={`flex items-center justify-center rounded-full p-1.5 shadow-md border-2 ${
                isSelected
                  ? 'bg-amber-400 border-white text-slate-900 ring-4 ring-amber-400/50 scale-110'
                  : 'bg-emerald-600 border-white text-white hover:bg-emerald-500'
              } transition-all duration-200`}
              style={{ width: isSelected ? '32px' : '28px', height: isSelected ? '32px' : '28px' }}
            >
              <IconComp className={isSelected ? 'w-4 h-4' : 'w-3.5 h-3.5'} />
            </div>
          );

          const customIcon = L.divIcon({
            html: iconHtml,
            className: 'custom-spot-marker',
            iconSize: isSelected ? [32, 32] : [28, 28],
            iconAnchor: isSelected ? [16, 16] : [14, 14],
          });

          const marker = L.marker(pt, { icon: customIcon }).addTo(layerGroup);

          marker.bindTooltip(`${m.name} (${m.visit_count}回)`, {
            permanent: false,
            direction: 'top',
            offset: [0, -12],
          });

          marker.on('click', () => {
            setSelectedMarker(m);
          });

          allPoints.push(pt);
        }
      });
    }

    const currentFitKey = `${selectedPolyline?.activity_id || ''}_${selectedRoute?.route_id || ''}_${selectedYear}_${heatmapData.polylines.length}`;
    if (prevFitKeyRef.current !== currentFitKey) {
      prevFitKeyRef.current = currentFitKey;
      if (selectedPolyline) {
        const targetPolyline = decodedPolylines.find((r) => r.activity_id === selectedPolyline.activity_id);
        if (targetPolyline && targetPolyline.coords.length > 0) {
          map.fitBounds(L.latLngBounds(targetPolyline.coords), { padding: [40, 40] });
        } else if (allPoints.length > 0) {
          map.fitBounds(L.latLngBounds(allPoints), { padding: [30, 30] });
        }
      } else if (selectedRoute) {
        const targetRoute = decodedMasterRoutes.find((r) => r.route_id === selectedRoute.route_id);
        if (targetRoute && targetRoute.coords.length > 0) {
          map.fitBounds(L.latLngBounds(targetRoute.coords), { padding: [40, 40] });
        } else if (allPoints.length > 0) {
          map.fitBounds(L.latLngBounds(allPoints), { padding: [30, 30] });
        }
      } else if (allPoints.length > 0) {
        map.fitBounds(L.latLngBounds(allPoints), { padding: [30, 30] });
      }
    }

    setTimeout(() => {
      map.invalidateSize();
    }, 200);
  }, [decodedPolylines, decodedMasterRoutes, heatmapData.markers, selectedPolyline, selectedRoute, selectedMarker, showSpots]);

  // Metrics summary stats
  const metricsTotal = useMemo(() => {
    return metrics.reduce(
      (acc, m) => ({
        distance: acc.distance + m.distance_km,
        elevation: acc.elevation + m.elevation_m,
        time: acc.time + m.moving_hours,
        rides: acc.rides + m.ride_count,
        calories: acc.calories + m.calories_kcal,
      }),
      { distance: 0, elevation: 0, time: 0, rides: 0, calories: 0 }
    );
  }, [metrics]);

  const maxMetricValues = useMemo(() => {
    return {
      distance: Math.max(...metrics.map((m) => m.distance_km), 1),
      elevation: Math.max(...metrics.map((m) => m.elevation_m), 1),
      time: Math.max(...metrics.map((m) => m.moving_hours), 1),
      rides: Math.max(...metrics.map((m) => m.ride_count), 1),
      calories: Math.max(...metrics.map((m) => m.calories_kcal), 1),
    };
  }, [metrics]);

  return (
    <div className="space-y-8">
      <style>{`
        .map-tiles-grayscale {
          filter: grayscale(100%) contrast(105%);
        }
        .custom-spot-marker {
          background: transparent !important;
          border: none !important;
        }
      `}</style>
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-700">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <BarChart2 className="w-6 h-6 text-blue-600" />
            可視化 / 分析 (SCR-05)
          </h1>
          <p className="text-xs text-slate-500 mt-1">走行パフォーマンスメトリクス可視化および Polyline ヒートマップ分析</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Time Range Selector */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <button
              onClick={() => setRangeType('annual')}
              className={`px-3.5 py-1.5 rounded-lg font-bold text-xs transition ${
                rangeType === 'annual'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              年間
            </button>
            <button
              onClick={() => setRangeType('monthly')}
              className={`px-3.5 py-1.5 rounded-lg font-bold text-xs transition ${
                rangeType === 'monthly'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              月間
            </button>
            <button
              onClick={() => setRangeType('weekly')}
              className={`px-3.5 py-1.5 rounded-lg font-bold text-xs transition ${
                rangeType === 'weekly'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              週間
            </button>
          </div>

          {/* Bike Filter Dropdown */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={bikeId}
              onChange={(e) => setBikeId(e.target.value)}
              className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">すべての自転車</option>
              {bikes.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.bike_code})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Summary Metrics Cards (5 Key Performance Indicators) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-blue-600 dark:text-blue-400">
            <span className="text-xs font-bold text-slate-400 uppercase">走行距離</span>
            <ActivityIcon className="w-4 h-4" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-extrabold text-slate-900 dark:text-white">
              {metricsTotal.distance.toFixed(1)}
            </span>
            <span className="text-xs font-medium text-slate-500">km</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-indigo-600 dark:text-indigo-400">
            <span className="text-xs font-bold text-slate-400 uppercase">獲得標高</span>
            <Mountain className="w-4 h-4" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-extrabold text-slate-900 dark:text-white">
              +{metricsTotal.elevation.toLocaleString()}
            </span>
            <span className="text-xs font-medium text-slate-500">m</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-amber-500 dark:text-amber-400">
            <span className="text-xs font-bold text-slate-400 uppercase">移動時間</span>
            <Clock className="w-4 h-4" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-extrabold text-slate-900 dark:text-white">
              {metricsTotal.time.toFixed(1)}
            </span>
            <span className="text-xs font-medium text-slate-500">時間</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
            <span className="text-xs font-bold text-slate-400 uppercase">ライド回数</span>
            <Trophy className="w-4 h-4" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-extrabold text-slate-900 dark:text-white">
              {metricsTotal.rides}
            </span>
            <span className="text-xs font-medium text-slate-500">回</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-2 col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-rose-500 dark:text-rose-400">
            <span className="text-xs font-bold text-slate-400 uppercase">消費カロリー</span>
            <Flame className="w-4 h-4" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-extrabold text-slate-900 dark:text-white">
              {metricsTotal.calories.toLocaleString()}
            </span>
            <span className="text-xs font-medium text-slate-500">kcal</span>
          </div>
        </div>
      </div>

      {/* Metrics Interactive Visual Charts Section */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <ActivityIcon className="w-5 h-5 text-blue-600" /> 期間別走行メトリクス可視化
          </h2>

          {/* Metric Tab Controls */}
          <div className="flex flex-wrap items-center gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl">
            <button
              onClick={() => setSelectedMetricTab('distance')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                selectedMetricTab === 'distance'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              走行距離 (km)
            </button>
            <button
              onClick={() => setSelectedMetricTab('elevation')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                selectedMetricTab === 'elevation'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              獲得標高 (m)
            </button>
            <button
              onClick={() => setSelectedMetricTab('time')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                selectedMetricTab === 'time'
                  ? 'bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              移動時間 (h)
            </button>
            <button
              onClick={() => setSelectedMetricTab('rides')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                selectedMetricTab === 'rides'
                  ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              回数 (回)
            </button>
            <button
              onClick={() => setSelectedMetricTab('calories')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                selectedMetricTab === 'calories'
                  ? 'bg-white dark:bg-slate-700 text-rose-600 dark:text-rose-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              カロリー (kcal)
            </button>
          </div>
        </div>

        {loadingMetrics ? (
          <div className="flex items-center justify-center py-16">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : metrics.length === 0 ? (
          <p className="text-center py-12 text-slate-400 text-xs">対象期間のデータが存在しません</p>
        ) : (
          <div className="space-y-3">
            {metrics.map((m) => {
              let val = 0;
              let maxVal = 1;
              let unit = '';
              let barColor = 'bg-blue-600';

              if (selectedMetricTab === 'distance') {
                val = m.distance_km;
                maxVal = maxMetricValues.distance;
                unit = 'km';
                barColor = 'bg-blue-600';
              } else if (selectedMetricTab === 'elevation') {
                val = m.elevation_m;
                maxVal = maxMetricValues.elevation;
                unit = 'm';
                barColor = 'bg-indigo-600';
              } else if (selectedMetricTab === 'time') {
                val = m.moving_hours;
                maxVal = maxMetricValues.time;
                unit = 'h';
                barColor = 'bg-amber-500';
              } else if (selectedMetricTab === 'rides') {
                val = m.ride_count;
                maxVal = maxMetricValues.rides;
                unit = '回';
                barColor = 'bg-emerald-600';
              } else {
                val = m.calories_kcal;
                maxVal = maxMetricValues.calories;
                unit = 'kcal';
                barColor = 'bg-rose-500';
              }

              const percent = Math.min(100, Math.max(4, (val / maxVal) * 100));

              return (
                <div key={m.period} className="flex items-center gap-4 text-xs group">
                  <span className="w-20 font-mono font-semibold text-slate-600 dark:text-slate-400">{m.period}</span>
                  <div className="flex-1 bg-slate-100 dark:bg-slate-900 h-6 rounded-xl overflow-hidden p-1 border border-slate-200/60 dark:border-slate-700/60">
                    <div
                      className={`${barColor} h-full rounded-lg transition-all duration-500 flex items-center justify-end pr-2 text-[10px] text-white font-bold shadow-sm`}
                      style={{ width: `${percent}%` }}
                    >
                      {percent > 15 && `${val} ${unit}`}
                    </div>
                  </div>
                  <span className="w-24 font-extrabold text-slate-900 dark:text-white text-right">
                    {val.toLocaleString()} {unit}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Polyline Heatmap Interactive Route Section */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <MapPin className="w-5 h-5 text-rose-500" /> Polyline ヒートマップ & ルート解析
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">Strava GPS 走行軌跡をデコードし、重複ルートの重なりと滞在スポットを表示</p>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            {/* Year Filter Listbox */}
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-400" />
              <select
                value={selectedYear}
                onChange={(e) => {
                  const y = e.target.value;
                  setSelectedYear(y);
                  fetchHeatmapData(y);
                }}
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {availableYears.map((y) => (
                  <option key={y} value={y}>
                    {y}年
                  </option>
                ))}
                <option value="all">すべての年</option>
              </select>
            </div>

            {/* Map Display Toggles */}
            <div className="flex items-center gap-3 bg-slate-100 dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showSpots}
                  onChange={(e) => setShowSpots(e.target.checked)}
                  className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                />
                <span>スポット表示</span>
              </label>
              <span className="text-slate-300 dark:text-slate-700">|</span>
              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isGrayscale}
                  onChange={(e) => setIsGrayscale(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                />
                <span>グレースケール</span>
              </label>
            </div>

            {selectedRoute && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  選択中定番ルート: {selectedRoute.name} (走行回数 {selectedRoute.activity_count} 回)
                </span>
                <button
                  onClick={() => setSelectedRoute(null)}
                  className="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-medium transition"
                >
                  選択解除
                </button>
                <button
                  onClick={() => navigate(`/master?tab=routes&route_id=${selectedRoute.route_id}`)}
                  title="View Master"
                  className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold transition flex items-center gap-1"
                >
                  <RouteIcon className="w-3.5 h-3.5" /> マスタ管理へ
                </button>
              </div>
            )}

            {selectedPolyline && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  選択中: {selectedPolyline.name}
                </span>
                <button
                  onClick={() => setSelectedPolyline(null)}
                  className="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-medium transition"
                >
                  選択解除
                </button>
                <button
                  onClick={() => navigate(`/items/${selectedPolyline.activity_id}?type=activity`)}
                  title="View Details"
                  className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition"
                >
                  アクティビティ詳細
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Interactive Route Map Canvas */}
        <div className="w-full h-[450px] rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden relative shadow-inner flex items-center justify-center z-0">
          <div ref={mapContainerRef} className="w-full h-full" />
          {loadingHeatmap && (
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[1001]">
              <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
            </div>
          )}

          {/* Map Overlay Controls / Info Box */}
          {selectedMarker && (
            <div className="absolute bottom-4 left-4 right-4 sm:right-auto max-w-sm bg-slate-800/90 backdrop-blur-md border border-slate-700 p-4 rounded-xl text-white shadow-xl space-y-2 animate-in fade-in duration-200 z-[1000]">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {selectedMarker.category_name}
                </span>
                <button onClick={() => setSelectedMarker(null)} title="Close" className="text-slate-400 hover:text-white">
                  ✕
                </button>
              </div>
              <h4 className="font-bold text-sm">{selectedMarker.name}</h4>
              <p className="text-xs text-slate-400">{selectedMarker.address || '住所情報なし'}</p>
              <div className="flex items-center justify-between pt-2 border-t border-slate-700">
                <span className="text-xs font-semibold text-emerald-400">訪問回数: {selectedMarker.visit_count} 回</span>
                <button
                  onClick={() => navigate(`/items/${selectedMarker.place_id}?type=place`)}
                  title="View Details"
                  className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition"
                >
                  スポット詳細
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Regular Routes Section */}
        {heatmapData.routes && heatmapData.routes.length > 0 && (
          <div className="space-y-3 pb-2 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <RouteIcon className="w-4 h-4 text-purple-600" /> 定番ルート一覧 ({heatmapData.routes.length} 件)
              </h3>
              <span className="text-xs text-slate-400">近似度70%超で自動検出された定番ルート</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {heatmapData.routes.map((route) => {
                const isSelected = selectedRoute?.route_id === route.route_id;

                return (
                  <div
                    key={route.route_id}
                    onClick={() => {
                      setSelectedRoute(route);
                      setSelectedPolyline(null);
                      setSelectedMarker(null);
                    }}
                    className={`p-4 rounded-xl border cursor-pointer transition flex items-center justify-between ${
                      isSelected
                        ? 'border-purple-500 bg-purple-50/70 dark:bg-purple-950/40 shadow-sm'
                        : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/40'
                    }`}
                  >
                    <div className="space-y-1">
                      <h4 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-1.5">
                        {route.name}
                        {isSelected && <span className="w-2 h-2 rounded-full bg-purple-500"></span>}
                      </h4>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 font-bold text-[11px]">
                          走行回数 {route.activity_count} 回
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenRouteModal(route.route_id);
                        }}
                        title="定番ルート詳細"
                        className="p-2 rounded-lg border border-purple-200 dark:border-purple-800 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/50 transition"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Passed Activities List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
              単体アクティビティ一覧（未紐付けルート）
            </h3>
            <span className="text-xs text-slate-400">{sortedPolylines.length} 件</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {sortedPolylines.map((poly) => {
              const isSelected = selectedPolyline?.activity_id === poly.activity_id;

              return (
                <div
                  key={poly.activity_id}
                  onClick={() => {
                    setSelectedPolyline(poly);
                    setSelectedRoute(null);
                    setSelectedMarker(null);
                  }}
                  className={`p-4 rounded-xl border cursor-pointer transition flex items-center justify-between ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50/70 dark:bg-blue-900/40 shadow-sm'
                      : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/40'
                  }`}
                >
                  <div className="space-y-1">
                    <h4 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-1.5">
                      {poly.name}
                      {isSelected && <span className="w-2 h-2 rounded-full bg-blue-500"></span>}
                    </h4>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-slate-400">
                        {new Date(poly.start_date).toLocaleDateString('ja-JP')}
                      </span>
                      {poly.distance_km !== undefined && (
                        <span className="font-semibold text-blue-600 dark:text-blue-400">
                          {poly.distance_km.toFixed(1)} km
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/items/${poly.activity_id}?type=activity`);
                      }}
                      title="View Details"
                      className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                    <a
                      href={poly.strava_url}
                      target="_blank"
                      rel="noreferrer"
                      title="Strava Activity"
                      onClick={(e) => e.stopPropagation()}
                      className="p-2 rounded-lg border border-orange-200 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950/40 transition"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <RouteDetailModal
        routeId={modalRouteId}
        onClose={handleCloseRouteModal}
      />
    </div>
  );
};
