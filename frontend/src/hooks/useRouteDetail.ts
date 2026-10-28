import { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import { api } from '../services/api';
import { RouteMaster } from '../types';
import { decodePolyline } from '../utils/polyline';

export function useRouteDetail(routeId: number | null, onUpdated?: () => void) {
  const [routeDetail, setRouteDetail] = useState<RouteMaster | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [isEditingName, setIsEditingName] = useState(false);
  const [editingNameValue, setEditingNameValue] = useState('');
  const [savingName, setSavingName] = useState(false);

  const routeMapRef = useRef<HTMLDivElement>(null);
  const routeMapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!routeId) {
      setRouteDetail(null);
      setIsEditingName(false);
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    setIsEditingName(false);
    api.get<RouteMaster>(`/routes/${routeId}`)
      .then((res) => {
        setRouteDetail(res);
      })
      .catch((err: any) => {
        setErrorMessage(err.message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [routeId]);

  useEffect(() => {
    if (!routeDetail || !routeMapRef.current) return;

    if (routeMapInstanceRef.current) {
      routeMapInstanceRef.current.remove();
      routeMapInstanceRef.current = null;
    }

    if ((routeMapRef.current as any)._leaflet_id) {
      (routeMapRef.current as any)._leaflet_id = null;
    }

    const coords = decodePolyline(routeDetail.summary_polyline || '');
    if (coords.length === 0) return;

    const map = L.map(routeMapRef.current).setView(coords[0], 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap',
    }).addTo(map);

    const polyline = L.polyline(coords, {
      color: '#0284c7',
      weight: 5,
      opacity: 0.9,
    }).addTo(map);

    map.fitBounds(polyline.getBounds(), { padding: [20, 20] });
    routeMapInstanceRef.current = map;

    setTimeout(() => {
      map.invalidateSize();
    }, 200);

    return () => {
      if (routeMapInstanceRef.current) {
        routeMapInstanceRef.current.remove();
        routeMapInstanceRef.current = null;
      }
    };
  }, [routeDetail]);

  const handleStartEditName = () => {
    if (!routeDetail) return;
    setEditingNameValue(routeDetail.name);
    setIsEditingName(true);
  };

  const handleCancelEditName = () => {
    setIsEditingName(false);
    setEditingNameValue('');
  };

  const handleSaveName = async () => {
    if (!routeDetail || !editingNameValue.trim()) return;
    setSavingName(true);
    setErrorMessage(null);
    try {
      await api.put(`/routes/${routeDetail.id}`, { name: editingNameValue.trim() });
      setRouteDetail({ ...routeDetail, name: editingNameValue.trim() });
      setIsEditingName(false);
      onUpdated?.();
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setSavingName(false);
    }
  };

  return {
    routeDetail,
    loading,
    errorMessage,
    isEditingName,
    editingNameValue,
    setEditingNameValue,
    savingName,
    routeMapRef,
    handleStartEditName,
    handleCancelEditName,
    handleSaveName,
  };
}
