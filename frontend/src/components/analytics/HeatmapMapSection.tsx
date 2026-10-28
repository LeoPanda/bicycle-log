import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { renderToStaticMarkup } from 'react-dom/server';
import L from 'leaflet';
import { Maximize2, Minimize2 } from 'lucide-react';
import { decodePolyline } from '../../utils/polyline';
import { getCategoryIconComponent } from '../../utils/categoryIcons';
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
  const navigate = useNavigate();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  // Global popup button handlers
  useEffect(() => {
    (window as any).__onSelectRouteById = (id: number) => {
      const target = heatmapData.routes.find((r) => r.route_id === id);
      if (target) onSelectRoute(target);
    };
    (window as any).__onNavigate = (path: string) => {
      navigate(path);
    };
    return () => {
      delete (window as any).__onSelectRouteById;
      delete (window as any).__onNavigate;
    };
  }, [heatmapData.routes, onSelectRoute, navigate]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (mapInstanceRef.current) mapInstanceRef.current.invalidateSize();
    }, 150);
    return () => clearTimeout(timer);
  }, [isFullscreenMap]);

  useEffect(() => {
    if (tileLayerRef.current) {
      const el = tileLayerRef.current.getContainer();
      if (el) isGrayscale ? el.classList.add('map-tiles-grayscale') : el.classList.remove('map-tiles-grayscale');
    }
  }, [isGrayscale]);

  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current).setView([34.9, 135.5], 11);
      const tile = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap',
        className: isGrayscale ? 'map-tiles-grayscale' : '',
      }).addTo(map);
      tileLayerRef.current = tile;
      layerGroupRef.current = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;
    const layerGroup = layerGroupRef.current;
    if (!map || !layerGroup) return;

    layerGroup.clearLayers();
    const allCoords: [number, number][] = [];

    // 1. Individual polylines (Blue) -> Navigate to bicycle-log activity detail
    heatmapData.polylines.forEach((p) => {
      const coords = decodePolyline(p.polyline);
      if (coords.length > 0) {
        const line = L.polyline(coords, { color: '#3b82f6', weight: 3.5, opacity: 0.75 });
        const popup = `<div style="font-size:12px;min-width:160px;"><b style="color:#1e293b;font-size:13px;">${p.name}</b><br/><span style="color:#64748b;">距離: ${p.distance_km || 0} km</span><br/><button onclick="window.__onNavigate('/items/${p.activity_id}?type=activity')" style="margin-top:6px;width:100%;padding:5px 8px;background:#2563eb;color:#fff;border:none;border-radius:6px;font-size:11px;font-weight:bold;cursor:pointer;">ルート詳細を見る ➔</button></div>`;
        line.bindPopup(popup).addTo(layerGroup);
        allCoords.push(...coords);
      }
    });

    // 2. Route polylines (Emerald) -> Open RouteDetailModal
    heatmapData.routes.forEach((r) => {
      const coords = decodePolyline(r.summary_polyline);
      if (coords.length > 0) {
        const line = L.polyline(coords, { color: '#10b981', weight: 5.0, opacity: 0.85 });
        const popup = `<div style="font-size:12px;min-width:170px;"><span style="color:#059669;font-weight:bold;font-size:10px;">定番ルート</span><br/><b style="color:#0f172a;font-size:13px;">${r.name}</b><br/><span style="color:#64748b;">走行回数: <b>${r.activity_count}</b> 回</span><br/><button onclick="window.__onSelectRouteById(${r.route_id})" style="margin-top:6px;width:100%;padding:5px 8px;background:#10b981;color:#fff;border:none;border-radius:6px;font-size:11px;font-weight:bold;cursor:pointer;">定番ルート詳細を見る ➔</button></div>`;
        line.bindPopup(popup).addTo(layerGroup);
        allCoords.push(...coords);
      }
    });

    // 3. Spots (Category Icons) -> Navigate to bicycle-log place detail
    if (showSpots) {
      heatmapData.markers.forEach((m) => {
        const pt: [number, number] = [m.latitude, m.longitude];
        const IconComp = getCategoryIconComponent(m.category_icon);
        const iconHtml = renderToStaticMarkup(
          <div className="flex items-center justify-center rounded-full p-1.5 shadow-md border-2 bg-amber-500 border-white text-white hover:bg-amber-400 transition" style={{ width: '28px', height: '28px' }}>
            <IconComp className="w-3.5 h-3.5" />
          </div>
        );
        const customIcon = L.divIcon({ html: iconHtml, className: 'custom-spot-marker', iconSize: [28, 28], iconAnchor: [14, 14] });
        const marker = L.marker(pt, { icon: customIcon }).addTo(layerGroup);
        const safePlaceId = encodeURIComponent(m.place_id);
        const popup = `<div style="font-size:12px;min-width:170px;"><span style="color:#d97706;font-weight:bold;font-size:10px;">${m.category_name || 'スポット'}</span><br/><b style="color:#0f172a;font-size:13px;">${m.name}</b><br/><span style="color:#64748b;">訪問: <b>${m.visit_count}</b> 回</span><br/>${m.address ? `<p style="margin:2px 0 6px;font-size:10px;color:#94a3b8;">${m.address}</p>` : ''}<button onclick="window.__onNavigate('/items/${safePlaceId}?type=place')" style="margin-top:4px;width:100%;padding:5px 8px;background:#f59e0b;color:#fff;border:none;border-radius:6px;font-size:11px;font-weight:bold;cursor:pointer;">スポット詳細を開く ➔</button></div>`;
        marker.bindPopup(popup);
        allCoords.push(pt);
      });
    }

    if (allCoords.length > 0) map.fitBounds(L.latLngBounds(allCoords), { padding: [30, 30] });
    setTimeout(() => map.invalidateSize(), 200);
  }, [heatmapData, showSpots]);

  return (
    <div className={`bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700/80 p-5 sm:p-7 shadow-sm space-y-4 ${
      isFullscreenMap ? 'fixed inset-0 z-50 p-4 rounded-none border-none flex flex-col' : ''
    }`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100 dark:border-slate-700/60">
        <div>
          <h3 className="font-bold text-slate-900 dark:text-white">走行ヒートマップ＆定番ルート</h3>
          <p className="text-xs text-slate-400">アクティビティのGPS軌跡と滞在スポットのオーバーレイ表示</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
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
            <input type="checkbox" checked={showSpots} onChange={(e) => setShowSpots(e.target.checked)} className="rounded text-amber-500 focus:ring-amber-500" />
            スポット表示
          </label>

          <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 font-semibold cursor-pointer">
            <input type="checkbox" checked={isGrayscale} onChange={(e) => setIsGrayscale(e.target.checked)} className="rounded text-slate-700 focus:ring-slate-700" />
            グレースケール
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

      <div className={`w-full rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700/80 ${
        isFullscreenMap ? 'flex-1 min-h-0' : 'h-[450px]'
      }`}>
        <div ref={mapContainerRef} className="w-full h-full z-0" />
      </div>
    </div>
  );
};
