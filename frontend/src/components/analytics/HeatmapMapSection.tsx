import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { Maximize2, Minimize2, MapPin, Navigation as RouteIcon, ExternalLink } from 'lucide-react';
import { decodePolyline } from '../../utils/polyline';
import { HeatmapPolyline, HeatmapRoute, HeatmapMarker } from '../../hooks/useAnalytics';

interface HeatmapMapSectionProps {
  heatmapData: {
    polylines: HeatmapPolyline[];
    routes: HeatmapRoute[];
    markers: HeatmapMarker[];
  };
  availableYears: string[];
  selectedYear: string;
  onYearChange: (year: string) => void;
  showSpots: boolean;
  setShowSpots: (val: boolean) => void;
  isGrayscale: boolean;
  setIsGrayscale: (val: boolean) => void;
  isFullscreenMap: boolean;
  setIsFullscreenMap: (val: boolean) => void;
  onSelectRoute: (route: HeatmapRoute) => void;
}

export const HeatmapMapSection: React.FC<HeatmapMapSectionProps> = ({
  heatmapData,
  availableYears,
  selectedYear,
  onYearChange,
  showSpots,
  setShowSpots,
  isGrayscale,
  setIsGrayscale,
  isFullscreenMap,
  setIsFullscreenMap,
  onSelectRoute,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current).setView([35.6812, 139.7671], 10);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap',
      }).addTo(map);

      const layerGroup = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;
      layerGroupRef.current = layerGroup;
    }

    const map = mapInstanceRef.current;
    const layerGroup = layerGroupRef.current;
    if (!map || !layerGroup) return;

    layerGroup.clearLayers();

    const allCoords: [number, number][] = [];

    // Draw individual polylines
    heatmapData.polylines.forEach((p) => {
      const coords = decodePolyline(p.polyline);
      if (coords.length > 0) {
        L.polyline(coords, {
          color: '#3b82f6',
          weight: 3.5,
          opacity: 0.75,
        }).bindPopup(`<b>${p.name}</b><br/>${p.distance_km || 0} km`).addTo(layerGroup);
        allCoords.push(...coords);
      }
    });

    // Draw route polylines
    heatmapData.routes.forEach((r) => {
      const coords = decodePolyline(r.summary_polyline);
      if (coords.length > 0) {
        L.polyline(coords, {
          color: '#10b981',
          weight: 4.5,
          opacity: 0.85,
        }).bindPopup(`<b>[定番ルート] ${r.name}</b><br/>${r.activity_count} ライド`).addTo(layerGroup);
        allCoords.push(...coords);
      }
    });

    // Draw markers
    if (showSpots) {
      heatmapData.markers.forEach((m) => {
        const marker = L.circleMarker([m.latitude, m.longitude], {
          radius: Math.min(Math.max(m.visit_count * 2, 6), 16),
          fillColor: '#f97316',
          color: '#ea580c',
          weight: 2,
          opacity: 1,
          fillOpacity: 0.8,
        });
        marker.bindPopup(`<b>${m.name}</b><br/>${m.category_name || '未分類'}<br/>訪問: ${m.visit_count}回`);
        marker.addTo(layerGroup);
        allCoords.push([m.latitude, m.longitude]);
      });
    }

    if (allCoords.length > 0) {
      map.fitBounds(L.latLngBounds(allCoords), { padding: [30, 30] });
    }

    setTimeout(() => {
      map.invalidateSize();
    }, 200);
  }, [heatmapData, showSpots]);

  return (
    <div className={`bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm space-y-4 ${
      isFullscreenMap ? 'fixed inset-4 z-50 overflow-hidden' : ''
    }`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100 dark:border-slate-700">
        <div>
          <h3 className="font-bold text-slate-900 dark:text-white">走行ヒートマップ＆定番ルート</h3>
          <p className="text-xs text-slate-400">アクティビティのGPS軌跡と滞在スポットのオーバーレイ表示</p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedYear}
            onChange={(e) => onYearChange(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold"
          >
            <option value="all">全期間</option>
            {availableYears.map((y) => (
              <option key={y} value={y}>{y}年</option>
            ))}
          </select>

          <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 font-semibold cursor-pointer">
            <input
              type="checkbox"
              checked={showSpots}
              onChange={(e) => setShowSpots(e.target.checked)}
              className="rounded text-orange-600"
            />
            スポット表示
          </label>

          <button
            onClick={() => setIsFullscreenMap(!isFullscreenMap)}
            title="Toggle fullscreen"
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            {isFullscreenMap ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <div className={`w-full rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 ${
        isFullscreenMap ? 'h-[calc(100%-80px)]' : 'h-96'
      }`}>
        <div ref={mapContainerRef} className="w-full h-full z-0" />
      </div>
    </div>
  );
};
