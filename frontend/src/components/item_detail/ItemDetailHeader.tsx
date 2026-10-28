import React, { useState } from 'react';
import { ArrowLeft, MapPin, ExternalLink, Pencil, Trash2, Check, X, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { ActivityStatsGrid } from './ActivityStatsGrid';
import { PlaceCommentBox } from './PlaceCommentBox';

interface ItemDetailHeaderProps {
  item: any;
  itemType: 'activity' | 'place';
  onRefresh: () => void;
  onOpenCategoryModal: () => void;
  onOpenBikeModal: () => void;
  onOpenPlaceModal: () => void;
}

export const ItemDetailHeader: React.FC<ItemDetailHeaderProps> = ({
  item,
  itemType,
  onRefresh,
  onOpenCategoryModal,
  onOpenBikeModal,
  onOpenPlaceModal,
}) => {
  const navigate = useNavigate();

  // Name Edit
  const [isEditingName, setIsEditingName] = useState(false);
  const [editingName, setEditingName] = useState('');
  const [savingName, setSavingName] = useState(false);

  // Deleting
  const [deletingActivity, setDeletingActivity] = useState(false);

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
      onRefresh();
    } catch (err: any) {
      alert(`名称の変更に失敗しました: ${err.message}`);
    } finally {
      setSavingName(false);
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

  return (
    <div className="space-y-4">
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-blue-600 transition"
      >
        <ArrowLeft className="w-4 h-4" /> 戻る
      </button>

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
                onClick={onOpenCategoryModal}
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

            {itemType === 'place' && (
              <PlaceCommentBox
                placeId={item.id}
                initialComment={item.comment}
                onSuccess={onRefresh}
              />
            )}
          </div>

          {itemType === 'place' && (
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={onOpenPlaceModal}
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

        {itemType === 'activity' && (
          <ActivityStatsGrid item={item} onOpenBikeModal={onOpenBikeModal} />
        )}
      </div>
    </div>
  );
};
