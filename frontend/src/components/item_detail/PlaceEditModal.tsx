import React, { useState, useEffect } from 'react';
import { MapPin, Search, Loader2, X, Check } from 'lucide-react';
import { api } from '../../services/api';

interface PlaceEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newPlaceId?: number) => void;
  editingStay?: any;
  item: any;
  itemType: 'activity' | 'place';
}

export const PlaceEditModal: React.FC<PlaceEditModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  editingStay,
  item,
  itemType,
}) => {
  const [placeSearchQuery, setPlaceSearchQuery] = useState('');
  const [nearbyPlaces, setNearbyPlaces] = useState<any[]>([]);
  const [loadingNearby, setLoadingNearby] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<any>(null);
  const [savingPlace, setSavingPlace] = useState(false);

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

  useEffect(() => {
    if (!isOpen) return;
    setSelectedPlace(null);
    setPlaceSearchQuery('');
    const lat = editingStay ? (editingStay.latitude || item.latitude) : item.latitude;
    const lng = editingStay ? (editingStay.longitude || item.longitude) : item.longitude;
    fetchNearbyPlaces(lat, lng, 2000, '');
  }, [isOpen, editingStay, item]);

  if (!isOpen) return null;

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
        await api.updateStayLogPlace(editingStay.id, {
          place_id: selectedPlace.id,
          name: selectedPlace.name,
          address: selectedPlace.address,
          latitude: selectedPlace.latitude,
          longitude: selectedPlace.longitude,
          category_name: selectedPlace.category_name,
        });
        onSuccess();
      } else if (itemType === 'place' && item) {
        const res = await api.overwritePlace(item.id, {
          new_place_id: selectedPlace.id,
          name: selectedPlace.name,
          address: selectedPlace.address,
          latitude: selectedPlace.latitude,
          longitude: selectedPlace.longitude,
          category_name: selectedPlace.category_name,
        });
        onSuccess(res?.id);
      }
      onClose();
    } catch (err: any) {
      alert(`地点の更新に失敗しました: ${err.message}`);
    } finally {
      setSavingPlace(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-3">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <MapPin className="w-5 h-5 text-blue-600" /> 地点（スポット）の変更
          </h3>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="text-xs text-slate-500 dark:text-slate-400">
          滞在地点周辺 2km 以内のスポットを表示しています。検索窓から地点名を入力して絞り込むことも可能です。
        </div>

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
                      <span className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate">{place.name}</span>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 shrink-0">
                        {place.category_name}
                      </span>
                    </div>
                    {place.address && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{place.address}</p>
                    )}
                    <p className="text-[11px] text-blue-600 dark:text-blue-400 font-medium">周辺 {place.distance_meters} m</p>
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

        <div className="flex justify-end gap-3 pt-2 border-t border-slate-200 dark:border-slate-700">
          <button
            type="button"
            onClick={onClose}
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
  );
};
