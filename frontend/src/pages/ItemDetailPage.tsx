import React, { useEffect, useState, useRef } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Calendar, ExternalLink, Image as ImageIcon, Plus, Trash2, Clock, Upload, Link as LinkIcon, RefreshCw, Pencil, Search, Check, X, Loader2, Tag as TagIcon, ChevronRight, Bike } from 'lucide-react';
import L from 'leaflet';
import { api } from '../services/api';
import { decodePolyline } from '../utils/polyline';
import { getCategoryIconComponent } from '../utils/categoryIcons';


export const ItemDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const itemType = searchParams.get('type') === 'place' ? 'place' : 'activity';

  const [item, setItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  // Image Modal states
  const [showImageModal, setShowImageModal] = useState(false);
  const [viewingImage, setViewingImage] = useState<any>(null);
  const [selectedStayId, setSelectedStayId] = useState<number | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [webUrl, setWebUrl] = useState('');
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);

  // Place Edit Modal states
  const [showPlaceModal, setShowPlaceModal] = useState(false);
  const [editingStay, setEditingStay] = useState<any>(null);
  const [placeSearchQuery, setPlaceSearchQuery] = useState('');
  const [nearbyPlaces, setNearbyPlaces] = useState<any[]>([]);
  const [loadingNearby, setLoadingNearby] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<any>(null);
  const [savingPlace, setSavingPlace] = useState(false);


  // Category Edit Modal states
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [savingCategory, setSavingCategory] = useState(false);

  // Activity / Place Name Edit states
  const [isEditingName, setIsEditingName] = useState(false);
  const [editingName, setEditingName] = useState('');
  const [savingName, setSavingName] = useState(false);

  // Place Comment Edit states
  const [isEditingPlaceComment, setIsEditingPlaceComment] = useState(false);
  const [editingPlaceComment, setEditingPlaceComment] = useState('');
  const [savingPlaceComment, setSavingPlaceComment] = useState(false);

  // Photo Comment Edit states
  const [isEditingPhotoComment, setIsEditingPhotoComment] = useState(false);
  const [editingPhotoComment, setEditingPhotoComment] = useState('');
  const [savingPhotoComment, setSavingPhotoComment] = useState(false);

  // Bike Edit Modal states
  const [showBikeModal, setShowBikeModal] = useState(false);
  const [bikes, setBikes] = useState<any[]>([]);
  const [loadingBikes, setLoadingBikes] = useState(false);
  const [selectedBikeId, setSelectedBikeId] = useState<number | null>(null);
  const [savingBike, setSavingBike] = useState(false);

  // Map display controls state
  const [showSpots, setShowSpots] = useState(true);
  const [isGrayscale, setIsGrayscale] = useState(false);
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  // Activity Delete state
  const [deletingActivity, setDeletingActivity] = useState(false);

  const navigate = useNavigate();

  const handleSaveName = async () => {
    if (!item || !editingName.trim()) return;
    setSavingName(true);
    try {
      if (itemType === 'activity') {
        await api.put(`/activities/${item.id}`, { name: editingName.trim() });
      } else {
        await api.put(`/places/${item.id}`, { name: editingName.trim() });
      }
      setIsEditingName(false);
      fetchItemDetail();
    } catch (err: any) {
      alert(`名称の変更に失敗しました: ${err.message}`);
    } finally {
      setSavingName(false);
    }
  };

  const handleSavePlaceComment = async () => {
    if (!item || itemType !== 'place') return;
    setSavingPlaceComment(true);
    try {
      await api.put(`/places/${item.id}`, { comment: editingPlaceComment.trim() || null });
      setIsEditingPlaceComment(false);
      fetchItemDetail();
    } catch (err: any) {
      alert(`コメントの変更に失敗しました: ${err.message}`);
    } finally {
      setSavingPlaceComment(false);
    }
  };

  const handleSavePhotoComment = async () => {
    if (!viewingImage) return;
    setSavingPhotoComment(true);
    try {
      const updatedImg = await api.updateImageComment(viewingImage.id, editingPhotoComment.trim());
      setViewingImage({ ...viewingImage, comment: updatedImg.comment });
      setIsEditingPhotoComment(false);
      fetchItemDetail();
    } catch (err: any) {
      alert(`コメントの変更に失敗しました: ${err.message}`);
    } finally {
      setSavingPhotoComment(false);
    }
  };

  const handleOpenBikeModal = async () => {
    if (itemType !== 'activity' || !item) return;
    setSelectedBikeId(item.bike_id || null);
    setShowBikeModal(true);
    setLoadingBikes(true);
    try {
      const res = await api.get<any[]>('/bikes');
      setBikes(res);
    } catch (err) {
      console.error('Failed to load bikes:', err);
    } finally {
      setLoadingBikes(false);
    }
  };

  const handleSaveBikeChange = async () => {
    if (!item || itemType !== 'activity') return;
    setSavingBike(true);
    try {
      await api.put(`/activities/${item.id}`, {
        bike_id: selectedBikeId
      });
      setShowBikeModal(false);
      fetchItemDetail();
    } catch (err: any) {
      alert(`使用自転車の変更に失敗しました: ${err.message}`);
    } finally {
      setSavingBike(false);
    }
  };

  const handleDeleteActivity = async () => {
    if (!item || itemType !== 'activity') return;
    if (!confirm('このアクティビティを削除しますか？\n紐づく滞在記録、滞在写真、タグ情報もすべて削除されます。')) return;
    setDeletingActivity(true);
    try {
      await api.delete(`/activities/${item.id}`);
      navigate('/items', { replace: true });
    } catch (err: any) {
      alert(`削除に失敗しました: ${err.message}`);
      setDeletingActivity(false);
    }
  };

  const handleOpenCategoryModal = async () => {
    if (itemType !== 'place' || !item) return;
    setSelectedCategoryId(item.category_id || null);
    setShowCategoryModal(true);
    setLoadingCategories(true);
    try {
      const res = await api.get<any[]>('/place-categories');
      setCategories(res);
    } catch (err) {
      console.error('Failed to load categories:', err);
    } finally {
      setLoadingCategories(false);
    }
  };

  const handleSaveCategoryChange = async () => {
    if (!item || itemType !== 'place' || selectedCategoryId === null) return;
    setSavingCategory(true);
    try {
      await api.put(`/places/${item.id}`, {
        category_id: selectedCategoryId
      });
      setShowCategoryModal(false);
      fetchItemDetail();
    } catch (err: any) {
      alert(`カテゴリの変更に失敗しました: ${err.message}`);
    } finally {
      setSavingCategory(false);
    }
  };

  const fetchItemDetail = async () => {
    setLoading(true);
    try {
      if (itemType === 'activity') {
        const res = await api.get(`/activities/${id}`);
        setItem(res);
      } else {
        const res = await api.get(`/places/${id}`);
        setItem(res);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItemDetail();
  }, [id, itemType]);

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

      // Add stay log markers if showSpots is enabled
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
      // itemType === 'place'
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

  const handleAddImage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStayId) return;
    setUploading(true);
    try {
      const formData = new FormData();
      if (uploadFile) {
        formData.append('file', uploadFile);
      }
      if (webUrl) {
        formData.append('image_url', webUrl);
      }
      if (caption) {
        formData.append('comment', caption);
      }

      await api.uploadImage(selectedStayId, formData);
      setShowImageModal(false);
      setUploadFile(null);
      setWebUrl('');
      setCaption('');
      fetchItemDetail();
    } catch (err: any) {
      alert(`Upload failed: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteImage = async (imageId: number) => {
    if (!confirm('この画像を削除しますか？')) return;
    try {
      await api.delete(`/stay-logs/images/${imageId}`);
      if (viewingImage?.id === imageId) {
        setViewingImage(null);
      }
      fetchItemDetail();
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  const handleOpenPlaceModal = (stay?: any) => {
    setEditingStay(stay || null);
    setSelectedPlace(null);
    setPlaceSearchQuery('');
    setShowPlaceModal(true);
    const lat = stay ? (stay.latitude || item.latitude) : item.latitude;
    const lng = stay ? (stay.longitude || item.longitude) : item.longitude;
    fetchNearbyPlaces(lat, lng, 2000, '');
  };

  const fetchNearbyPlaces = async (lat: number, lng: number, radius: number, query: string) => {
    setLoadingNearby(true);
    try {
      const res = await api.searchNearbyPlaces(lat, lng, radius, query);
      setNearbyPlaces(res);
    } catch (err) {
      console.error('Failed to fetch nearby places:', err);
    } finally {
      setLoadingNearby(false);
    }
  };

  const handleSearchPlacesSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const lat = editingStay ? (editingStay.latitude || item.latitude) : item.latitude;
    const lng = editingStay ? (editingStay.longitude || item.longitude) : item.longitude;
    fetchNearbyPlaces(lat, lng, 2000, placeSearchQuery);
  };

  const handleSavePlaceChange = async () => {
    if (!selectedPlace) return;
    setSavingPlace(true);
    try {
      if (editingStay) {
        // Edit stay log in activity
        await api.updateStayLogPlace(editingStay.id, {
          place_id: selectedPlace.id,
          name: selectedPlace.name,
          address: selectedPlace.address,
          latitude: selectedPlace.latitude,
          longitude: selectedPlace.longitude,
          category_name: selectedPlace.category_name,
        });
      } else if (itemType === 'place' && item) {
        // Direct place detail edit
        const res = await api.overwritePlace(item.id, {
          new_place_id: selectedPlace.id,
          name: selectedPlace.name,
          address: selectedPlace.address,
          latitude: selectedPlace.latitude,
          longitude: selectedPlace.longitude,
          category_name: selectedPlace.category_name,
        });
        if (res && res.id && res.id !== id) {
          navigate(`/items/${res.id}?type=place`, { replace: true });
        }
      }
      setShowPlaceModal(false);
      fetchItemDetail();
    } catch (err: any) {
      alert(`地点の更新に失敗しました: ${err.message}`);
    } finally {
      setSavingPlace(false);
    }
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!item) {
    return <div className="text-center py-12 text-slate-500">データが見つかりません</div>;
  }

  return (
    <div className="space-y-8">
      {/* Back Header */}
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-blue-600 transition"
      >
        <ArrowLeft className="w-4 h-4" /> 戻る
      </button>

      {/* Main Info Header */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            {itemType === 'activity' ? (
              <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 mb-2">
                Strava アクティビティ
              </span>
            ) : (
              <button
                type="button"
                onClick={handleOpenCategoryModal}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/40 dark:hover:bg-blue-800/60 text-blue-700 dark:text-blue-300 mb-2 border border-blue-200 dark:border-blue-700/50 transition cursor-pointer group"
                title="カテゴリを変更"
              >
                <span>{item.category_name || '未分類'}</span>
                <Pencil className="w-3 h-3 text-blue-500 opacity-70 group-hover:opacity-100 transition" />
              </button>
            )}
            {isEditingName ? (
              <div className="flex items-center gap-2 mt-1">
                <input
                  type="text"
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveName();
                    if (e.key === 'Escape') setIsEditingName(false);
                  }}
                  autoFocus
                  className="text-xl sm:text-2xl font-bold px-3 py-1.5 border border-blue-500 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={handleSaveName}
                  disabled={savingName || !editingName.trim()}
                  className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition disabled:opacity-50"
                  title="保存"
                >
                  {savingName ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingName(false)}
                  className="p-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-300 transition"
                  title="キャンセル"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <h1
                onClick={() => {
                  setEditingName(item.name);
                  setIsEditingName(true);
                }}
                className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2.5 group cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition"
                title="クリックして名称を変更"
              >
                <span>{item.name}</span>
                <Pencil className="w-5 h-5 text-slate-400 opacity-60 group-hover:opacity-100 group-hover:text-blue-600 transition shrink-0" />
              </h1>
            )}
            {itemType === 'place' && item.address && (
              <p className="text-sm text-slate-500 mt-1 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-rose-500" /> {item.address}
              </p>
            )}

            {/* Place Comment Section */}
            {itemType === 'place' && (
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/60">
                {isEditingPlaceComment ? (
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400">コメントの編集</label>
                    <textarea
                      value={editingPlaceComment}
                      onChange={(e) => setEditingPlaceComment(e.target.value)}
                      placeholder="このスポットに関するコメント・メモを入力..."
                      rows={3}
                      autoFocus
                      className="w-full px-3 py-2 border border-blue-500 rounded-xl bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        type="button"
                        onClick={() => setIsEditingPlaceComment(false)}
                        className="px-3 py-1.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-300 transition"
                      >
                        キャンセル
                      </button>
                      <button
                        type="button"
                        onClick={handleSavePlaceComment}
                        disabled={savingPlaceComment}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition disabled:opacity-50 flex items-center gap-1"
                      >
                        {savingPlaceComment ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                        <span>保存</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => {
                      setEditingPlaceComment(item.comment || '');
                      setIsEditingPlaceComment(true);
                    }}
                    className="group cursor-pointer p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-700/60 hover:border-blue-300 dark:hover:border-blue-600 transition"
                    title="クリックしてコメントを編集"
                  >
                    <div className="flex items-center justify-between text-xs font-bold text-slate-400 dark:text-slate-500 mb-1">
                      <span>スポットコメント</span>
                      <Pencil className="w-3.5 h-3.5 text-slate-400 opacity-60 group-hover:opacity-100 group-hover:text-blue-600 transition" />
                    </div>
                    {item.comment ? (
                      <p className="text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap">{item.comment}</p>
                    ) : (
                      <p className="text-xs text-slate-400 italic">コメントなし (クリックして入力)</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {itemType === 'place' && (
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => handleOpenPlaceModal()}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-medium text-sm rounded-xl transition shadow-sm"
              >
                <Pencil className="w-4 h-4" /> 地点を編集
              </button>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${item.latitude},${item.longitude}`}
                target="_blank"
                rel="noreferrer"
                title="Google Maps Place"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm rounded-xl transition shadow-sm"
              >
                <ExternalLink className="w-4 h-4" /> Google Mapsで見る
              </a>
            </div>
          )}

          {itemType === 'activity' && (
            <div className="flex flex-wrap items-center gap-3">
              <a
                href={item.strava_url || `https://www.strava.com/activities/${item.id}`}
                target="_blank"
                rel="noreferrer"
                title="Strava Activity"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-medium text-sm rounded-xl transition shadow-sm"
              >
                <ExternalLink className="w-4 h-4" /> Stravaで表示
              </a>
              <button
                type="button"
                onClick={handleDeleteActivity}
                disabled={deletingActivity}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-medium text-sm rounded-xl transition shadow-sm disabled:opacity-50 cursor-pointer"
                title="アクティビティを削除"
              >
                {deletingActivity ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                <span>削除</span>
              </button>
            </div>
          )}
        </div>

        {/* Activity Details Grid */}
        {itemType === 'activity' && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-100 dark:border-slate-700">
            <div>
              <span className="text-xs text-slate-400 font-medium block">走行距離</span>
              <span className="text-xl font-bold text-slate-900 dark:text-white">
                {(item.distance / 1000).toFixed(1)} km
              </span>
            </div>
            <div>
              <span className="text-xs text-slate-400 font-medium block">獲得標高</span>
              <span className="text-xl font-bold text-slate-900 dark:text-white">
                +{item.total_elevation_gain} m
              </span>
            </div>
            <div
              onClick={handleOpenBikeModal}
              className="group cursor-pointer p-2 -m-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700/60 transition"
              title="クリックして自転車を再選択"
            >
              <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
                使用自転車
                <Pencil className="w-3 h-3 text-slate-400 opacity-60 group-hover:opacity-100 group-hover:text-blue-600 transition" />
              </span>
              <span className="text-xl font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition">
                {item.bike_name}
              </span>
            </div>
            <div>
              <span className="text-xs text-slate-400 font-medium block">実施日時</span>
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                {new Date(item.start_date).toLocaleString('ja-JP')}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Interactive Map Section */}
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

      {/* Stay Logs / Gallery Section */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 sm:p-8 shadow-sm">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
          <Clock className="w-5 h-5 text-amber-500" />
          {itemType === 'activity' ? 'このアクティビティ中の滞在記録' : '訪問履歴ログ'}
        </h2>

        {itemType === 'activity' ? (
          <div className="space-y-4">
            {item.stay_logs?.map((stay: any) => (
              <div
                key={stay.id}
                className="p-5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/40 space-y-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-bold text-slate-900 dark:text-white">
                        {stay.place_name || '滞在スポット'}
                      </h3>
                      {stay.notes && stay.notes.includes('(スタート地点)') && (
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                          スタート地点
                        </span>
                      )}
                      {stay.notes && stay.notes.includes('(ゴール地点)') && (
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
                          ゴール地点
                        </span>
                      )}
                      {stay.category_name && (
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                          {stay.category_name}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 flex items-center gap-2 mt-1">
                      <span>{stay.notes && stay.notes.includes('(ゴール地点)') ? '到着: ' : '出発/到着: '}{new Date(stay.arrived_at).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}</span>
                      <span>•</span>
                      <span>滞在時間: {Math.round(stay.stay_duration_seconds / 60)} 分</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedStayId(stay.id);
                        setShowImageModal(true);
                      }}
                      title="写真の追加"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition shadow-sm cursor-pointer"
                    >
                      <Plus className="w-4 h-4" /> 写真の追加
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate(`/items/${stay.place_id}?type=place`)}
                      title="スポット詳細を表示"
                      className="p-2 rounded-lg text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition cursor-pointer"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Images gallery */}
                {stay.images && stay.images.length > 0 && (
                  <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    {stay.images.map((img: any) => (
                      <div
                        key={img.id}
                        onClick={() => setViewingImage(img)}
                        className="relative rounded-lg overflow-hidden aspect-square bg-slate-200 dark:bg-slate-800 cursor-pointer hover:opacity-80 transition"
                      >
                        <img src={img.image_url} alt={img.comment || 'Stay photo'} className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {item.stay_logs?.map((stay: any) => (
              <div
                key={stay.id}
                className="p-5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/40 space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-base font-bold text-slate-900 dark:text-white">
                        {stay.activity_name || `アクティビティ #${stay.activity_id}`}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 flex items-center gap-2 mt-1">
                      <span>訪問日時: {new Date(stay.arrived_at).toLocaleString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                      <span>•</span>
                      <span>滞在時間: {Math.round(stay.stay_duration_seconds / 60)} 分</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedStayId(stay.id);
                        setShowImageModal(true);
                      }}
                      title="写真の追加"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition shadow-sm cursor-pointer"
                    >
                      <Plus className="w-4 h-4" /> 写真の追加
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate(`/items/${stay.activity_id}?type=activity`)}
                      title="アクティビティ詳細を表示"
                      className="p-2 rounded-lg text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition cursor-pointer"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Images gallery */}
                {stay.images && stay.images.length > 0 && (
                  <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    {stay.images.map((img: any) => (
                      <div
                        key={img.id}
                        onClick={() => setViewingImage(img)}
                        className="relative rounded-lg overflow-hidden aspect-square bg-slate-200 dark:bg-slate-800 cursor-pointer hover:opacity-80 transition"
                      >
                        <img src={img.image_url} alt={img.comment || 'Stay photo'} className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Image Modal */}
      {showImageModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-6">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-blue-600" /> 写真の追加
            </h3>

            <form onSubmit={handleAddImage} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
                  画像ファイルのアップロード (自動 WebP 80% 圧縮)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
              </div>

              <div className="relative text-center my-2">
                <span className="bg-white dark:bg-slate-800 px-2 text-xs text-slate-400">または</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
                  外部 Web 画像 URL ダイレクト指定
                </label>
                <input
                  type="url"
                  placeholder="https://example.com/photo.jpg"
                  value={webUrl}
                  onChange={(e) => setWebUrl(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
                  キャプション / コメント
                </label>
                <input
                  type="text"
                  placeholder="カフェの限定ラテ"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowImageModal(false)}
                  title="Close"
                  className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={uploading || (!uploadFile && !webUrl)}
                  title="Save Changes"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 transition disabled:opacity-50"
                >
                  {uploading ? 'アップロード中...' : '追加する'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Enlarged Photo Dialog */}
      {viewingImage && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => {
            setViewingImage(null);
            setIsEditingPhotoComment(false);
          }}
        >
          <div
            className="bg-white dark:bg-slate-800 rounded-2xl max-w-2xl w-full p-5 shadow-2xl space-y-4 max-h-[90vh] flex flex-col relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-blue-600" /> 写真の詳細
              </h3>
              <button
                onClick={() => {
                  setViewingImage(null);
                  setIsEditingPhotoComment(false);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 flex items-center justify-center overflow-hidden bg-slate-900/90 rounded-xl p-2 min-h-[250px] max-h-[60vh]">
              <img
                src={viewingImage.image_url}
                alt={viewingImage.comment || '拡大写真'}
                className="max-w-full max-h-[58vh] object-contain rounded-md"
              />
            </div>

            {isEditingPhotoComment ? (
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400">コメントの編集</label>
                <input
                  type="text"
                  value={editingPhotoComment}
                  onChange={(e) => setEditingPhotoComment(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSavePhotoComment();
                    if (e.key === 'Escape') setIsEditingPhotoComment(false);
                  }}
                  autoFocus
                  placeholder="写真のキャプション/コメントを入力..."
                  className="w-full px-3 py-2 border border-blue-500 rounded-xl text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditingPhotoComment(false)}
                    className="px-3 py-1 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold hover:bg-slate-300 transition"
                  >
                    キャンセル
                  </button>
                  <button
                    type="button"
                    onClick={handleSavePhotoComment}
                    disabled={savingPhotoComment}
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition disabled:opacity-50 flex items-center gap-1"
                  >
                    {savingPhotoComment ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    <span>保存</span>
                  </button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => {
                  setEditingPhotoComment(viewingImage.comment || '');
                  setIsEditingPhotoComment(true);
                }}
                className="group cursor-pointer p-3 rounded-xl bg-slate-100 dark:bg-slate-900/60 text-sm border border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-600 transition"
                title="クリックしてコメントを編集"
              >
                <div className="flex items-center justify-between text-xs font-semibold text-slate-400 dark:text-slate-500 mb-1">
                  <span>コメント</span>
                  <Pencil className="w-3.5 h-3.5 text-slate-400 opacity-60 group-hover:opacity-100 group-hover:text-blue-600 transition" />
                </div>
                {viewingImage.comment ? (
                  <p className="text-slate-800 dark:text-slate-200">{viewingImage.comment}</p>
                ) : (
                  <p className="text-xs text-slate-400 italic">コメントなし (クリックして入力)</p>
                )}
              </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => handleDeleteImage(viewingImage.id)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-xl transition shadow-sm cursor-pointer"
              >
                <Trash2 className="w-4 h-4" /> この写真を削除
              </button>

              <button
                type="button"
                onClick={() => {
                  setViewingImage(null);
                  setIsEditingPhotoComment(false);
                }}
                className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Place Edit Modal (Google Place API 2km Nearby & Keyword Search) */}
      {showPlaceModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-3">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <MapPin className="w-5 h-5 text-blue-600" /> 地点（スポット）の変更
              </h3>
              <button
                onClick={() => setShowPlaceModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs text-slate-500 dark:text-slate-400">
              滞在地点周辺 2km 以内のスポットを表示しています。検索窓から地点名を入力して絞り込むことも可能です。
            </div>

            {/* Keyword Search Form */}
            <form onSubmit={handleSearchPlacesSubmit} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="地点名やキーワードで検索 (例: コンビニ, カフェ)..."
                  value={placeSearchQuery}
                  onChange={(e) => setPlaceSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-sm bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition flex items-center gap-1"
              >
                検索
              </button>
            </form>

            {/* Candidates List */}
            <div className="flex-1 overflow-y-auto space-y-2 max-h-72 border border-slate-100 dark:border-slate-700/60 p-2 rounded-xl bg-slate-50/50 dark:bg-slate-900/40">
              {loadingNearby ? (
                <div className="flex items-center justify-center py-10 text-slate-400 gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                  <span>Google Places API 周辺検索中...</span>
                </div>
              ) : nearbyPlaces.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-sm">
                  周辺に該当する地点が見つかりませんでした
                </div>
              ) : (
                nearbyPlaces.map((place) => {
                  const isSelected = selectedPlace?.id === place.id;
                  return (
                    <div
                      key={place.id}
                      onClick={() => setSelectedPlace(place)}
                      className={`p-3 rounded-xl border cursor-pointer transition flex items-start justify-between gap-3 ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50/80 dark:bg-blue-950/40 ring-1 ring-blue-500'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-blue-300'
                      }`}
                    >
                      <div className="space-y-1 flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate">
                            {place.name}
                          </span>
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 shrink-0">
                            {place.category_name}
                          </span>
                        </div>
                        {place.address && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                            {place.address}
                          </p>
                        )}
                        <p className="text-[11px] text-blue-600 dark:text-blue-400 font-medium">
                          周辺 {place.distance_meters} m
                        </p>
                      </div>

                      {isSelected && (
                        <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 mt-1">
                          <Check className="w-4 h-4" />
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer Buttons */}
            <div className="flex justify-end gap-3 pt-2 border-t border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setShowPlaceModal(false)}
                className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                キャンセル
              </button>
              <button
                type="button"
                disabled={!selectedPlace || savingPlace}
                onClick={handleSavePlaceChange}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition disabled:opacity-40 flex items-center gap-2"
              >
                {savingPlace && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {savingPlace ? '保存中...' : 'この地点に更新する'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Category Selection Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-3">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <TagIcon className="w-5 h-5 text-blue-600" /> カテゴリの変更
              </h3>
              <button
                onClick={() => setShowCategoryModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              この滞在スポットのカテゴリを選択してください。
            </p>

            {/* Categories Grid List */}
            <div className="flex-1 overflow-y-auto space-y-2 max-h-80 border border-slate-100 dark:border-slate-700/60 p-2 rounded-xl bg-slate-50/50 dark:bg-slate-900/40">
              {loadingCategories ? (
                <div className="flex items-center justify-center py-10 text-slate-400 gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                  <span>カテゴリ一覧を読み込み中...</span>
                </div>
              ) : categories.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-sm">
                  カテゴリが登録されていません
                </div>
              ) : (
                categories.map((cat) => {
                  const isSelected = selectedCategoryId === cat.id;
                  return (
                    <div
                      key={cat.id}
                      onClick={() => setSelectedCategoryId(cat.id)}
                      className={`p-3 rounded-xl border cursor-pointer transition flex items-center justify-between gap-3 ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50/80 dark:bg-blue-950/40 ring-1 ring-blue-500'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-blue-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-sm">
                          {cat.name.slice(0, 1)}
                        </span>
                        <div>
                          <div className="font-bold text-sm text-slate-900 dark:text-slate-100">
                            {cat.name}
                          </div>
                          {cat.description && (
                            <div className="text-xs text-slate-500 dark:text-slate-400">
                              {cat.description}
                            </div>
                          )}
                        </div>
                      </div>

                      {isSelected && (
                        <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0">
                          <Check className="w-4 h-4" />
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer Buttons */}
            <div className="flex justify-end gap-3 pt-2 border-t border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setShowCategoryModal(false)}
                className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                キャンセル
              </button>
              <button
                type="button"
                disabled={selectedCategoryId === null || savingCategory}
                onClick={handleSaveCategoryChange}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition disabled:opacity-40 flex items-center gap-2"
              >
                {savingCategory && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {savingCategory ? '保存中...' : '変更を保存'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bike Selection Modal */}
      {showBikeModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-3">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Bike className="w-5 h-5 text-blue-600" /> 使用自転車の変更
              </h3>
              <button
                onClick={() => setShowBikeModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              このアクティビティで使用した自転車を選択してください。
            </p>

            <div className="flex-1 overflow-y-auto space-y-2 max-h-80 border border-slate-100 dark:border-slate-700/60 p-2 rounded-xl bg-slate-50/50 dark:bg-slate-900/40">
              {loadingBikes ? (
                <div className="flex items-center justify-center py-10 text-slate-400 gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                  <span>自転車一覧を読み込み中...</span>
                </div>
              ) : (
                <>
                  <div
                    onClick={() => setSelectedBikeId(null)}
                    className={`p-3 rounded-xl border cursor-pointer transition flex items-center justify-between gap-3 ${
                      selectedBikeId === null
                        ? 'border-blue-500 bg-blue-50/80 dark:bg-blue-950/40 ring-1 ring-blue-500'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-blue-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-500 flex items-center justify-center font-bold text-sm">
                        -
                      </div>
                      <div>
                        <div className="font-bold text-sm text-slate-900 dark:text-slate-100">
                          未設定
                        </div>
                      </div>
                    </div>
                    {selectedBikeId === null && (
                      <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0">
                        <Check className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                  {bikes.map((bike) => {
                    const isSelected = selectedBikeId === bike.id;
                    return (
                      <div
                        key={bike.id}
                        onClick={() => setSelectedBikeId(bike.id)}
                        className={`p-3 rounded-xl border cursor-pointer transition flex items-center justify-between gap-3 ${
                          isSelected
                            ? 'border-blue-500 bg-blue-50/80 dark:bg-blue-950/40 ring-1 ring-blue-500'
                            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-blue-300'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-sm">
                            <Bike className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="font-bold text-sm text-slate-900 dark:text-slate-100">
                              {bike.name}
                            </div>
                            {bike.brand && (
                              <div className="text-xs text-slate-500 dark:text-slate-400">
                                {bike.brand} {bike.model || ''}
                              </div>
                            )}
                          </div>
                        </div>

                        {isSelected && (
                          <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0">
                            <Check className="w-4 h-4" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-2 border-t border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setShowBikeModal(false)}
                className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                キャンセル
              </button>
              <button
                type="button"
                disabled={savingBike}
                onClick={handleSaveBikeChange}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition disabled:opacity-40 flex items-center gap-2"
              >
                {savingBike && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {savingBike ? '保存中...' : '変更を保存'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

