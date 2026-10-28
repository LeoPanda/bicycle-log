import React, { useEffect, useRef } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MapPin } from 'lucide-react';
import L from 'leaflet';
import { decodePolyline } from '../../utils/polyline';
import { getCategoryIconComponent } from '../../utils/categoryIcons';

interface ItemDetailMapProps {
  item: any;
  itemType: 'activity' | 'place';
  showSpots: boolean;
  setShowSpots: (val: boolean) => void;
  isGrayscale: boolean;
  setIsGrayscale: (val: boolean) => void;
}

export const ItemDetailMap: React.FC<ItemDetailMapProps> = ({
  item,
  itemType,
  showSpots,
  setShowSpots,
  isGrayscale,
  setIsGrayscale,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  useEffect(() => {
    if (!item || !mapContainerRef.current) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
      tileLayerRef.current = null;
    }
    if ((mapContainerRef.current as any)._leaflet_id) {
      (mapContainerRef.current as any)._leaflet_id = null;
    }

    const map = L.map(mapContainerRef.current);
    mapInstanceRef.current = map;

    const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      className: isGrayscale ? 'map-tiles-grayscale' : '',
    }).addTo(map);
    tileLayerRef.current = tileLayer;

    const allPoints: [number, number][] = [];

    if (itemType === 'activity') {
      if (item.summary_polyline) {
        const routeCoords = decodePolyline(item.summary_polyline);
        if (routeCoords.length > 0) {
          L.polyline(routeCoords, {
            color: '#2563eb',
            weight: 5,
            opacity: 0.85,
            lineCap: 'round',
            lineJoin: 'round',
          }).addTo(map);

          // Start marker
          const startPt = routeCoords[0];
          L.circleMarker(startPt, {
            radius: 7,
            fillColor: '#22c55e',
            color: '#ffffff',
            weight: 2,
            fillOpacity: 1,
          }).bindTooltip('スタート地点', { permanent: false }).addTo(map);

          // End marker
          const endPt = routeCoords[routeCoords.length - 1];
          L.circleMarker(endPt, {
            radius: 7,
            fillColor: '#ef4444',
            color: '#ffffff',
            weight: 2,
            fillOpacity: 1,
          }).bindTooltip('ゴール地点', { permanent: false }).addTo(map);

          allPoints.push(...routeCoords);
        }
      }

      if (showSpots && item.stay_logs && Array.isArray(item.stay_logs)) {
        item.stay_logs.forEach((stay: any) => {
          if (stay.latitude && stay.longitude) {
            const pt: [number, number] = [stay.latitude, stay.longitude];
            allPoints.push(pt);

            const IconComp = getCategoryIconComponent(stay.category_icon);
            const iconHtml = renderToStaticMarkup(
              <div
                className="flex items-center justify-center rounded-full p-1.5 shadow-md border-2 bg-amber-500 border-white text-white hover:bg-amber-400 transition-all duration-200"
                style={{ width: '28px', height: '28px' }}
              >
                <IconComp className="w-3.5 h-3.5" />
              </div>
            );

            const customIcon = L.divIcon({
              html: iconHtml,
              className: 'custom-spot-marker',
              iconSize: [28, 28],
              iconAnchor: [14, 14],
            });

            const stayMarker = L.marker(pt, { icon: customIcon }).addTo(map);
            const arrivedText = stay.arrived_at
              ? new Date(stay.arrived_at).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
              : '';
            const durationMin = stay.stay_duration_seconds ? Math.round(stay.stay_duration_seconds / 60) : 0;

            stayMarker.bindPopup(`
              <div style="font-family: sans-serif; font-size: 13px; color: #1e293b;">
                <strong style="font-size: 14px; color: #0f172a;">${stay.place_name || '滞在スポット'}</strong>
                <div style="margin-top: 4px; color: #64748b; font-size: 11px;">
                  ${arrivedText ? `到着: ${arrivedText}` : ''} ${durationMin ? `(${durationMin}分滞在)` : ''}
                </div>
                ${stay.place_address ? `<div style="margin-top: 2px; color: #94a3b8; font-size: 10px;">${stay.place_address}</div>` : ''}
              </div>
            `);
          }
        });
      }

      if (allPoints.length > 0) {
        map.fitBounds(L.latLngBounds(allPoints), { padding: [40, 40] });
      } else {
        map.setView([35.6812, 139.7671], 12);
      }
    } else {
      if (item.latitude && item.longitude) {
        const pt: [number, number] = [item.latitude, item.longitude];
        map.setView(pt, 15);

        const IconComp = getCategoryIconComponent(item.category_icon);
        const iconHtml = renderToStaticMarkup(
          <div
            className="flex items-center justify-center rounded-full p-2 shadow-lg border-2 bg-emerald-600 border-white text-white hover:bg-emerald-500 transition-all duration-200"
            style={{ width: '34px', height: '34px' }}
          >
            <IconComp className="w-4 h-4" />
          </div>
        );

        const customIcon = L.divIcon({
          html: iconHtml,
          className: 'custom-spot-marker',
          iconSize: [34, 34],
          iconAnchor: [17, 17],
        });

        const marker = L.marker(pt, { icon: customIcon }).addTo(map);
        marker.bindPopup(`
          <div style="font-family: sans-serif; font-size: 13px; color: #1e293b;">
            <strong style="font-size: 14px; color: #0f172a;">${item.name}</strong>
            ${item.address ? `<div style="margin-top: 4px; color: #64748b; font-size: 11px;">${item.address}</div>` : ''}
          </div>
        `).openPopup();
      } else {
        map.setView([35.6812, 139.7671], 12);
      }
    }

    setTimeout(() => {
      map.invalidateSize();
    }, 200);

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        tileLayerRef.current = null;
      }
      if (mapContainerRef.current) {
        (mapContainerRef.current as any)._leaflet_id = null;
      }
    };
  }, [item, itemType, showSpots]);

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

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
      <style>{`
        .map-tiles-grayscale {
          filter: grayscale(100%) contrast(105%);
        }
      `}</style>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 px-2">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <MapPin className="w-5 h-5 text-blue-600" /> 位置情報・ルートマップ
        </h2>

        <div className="flex items-center gap-3 bg-slate-100 dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
          {itemType === 'activity' && (
            <>
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
            </>
          )}
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
      </div>
      <div className="w-full h-96 rounded-xl overflow-hidden relative border border-slate-200 dark:border-slate-700 z-0">
        <div ref={mapContainerRef} className="w-full h-full" />
      </div>
    </div>
  );
};
