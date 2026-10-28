import React from 'react';
import { Clock, Plus, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface StayLogSectionProps {
  itemType: 'activity' | 'place';
  stayLogs: any[];
  onAddImageClick: (stayId: number) => void;
  onViewImageClick: (image: any) => void;
}

export const StayLogSection: React.FC<StayLogSectionProps> = ({
  itemType,
  stayLogs,
  onAddImageClick,
  onViewImageClick,
}) => {
  const navigate = useNavigate();

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 sm:p-8 shadow-sm">
      <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
        <Clock className="w-5 h-5 text-amber-500" />
        {itemType === 'activity' ? 'このアクティビティ中の滞在記録' : '訪問履歴ログ'}
      </h2>

      {itemType === 'activity' ? (
        <div className="space-y-4">
          {stayLogs?.map((stay: any) => (
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
                    onClick={() => onAddImageClick(stay.id)}
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

              {stay.images && stay.images.length > 0 && (
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  {stay.images.map((img: any) => (
                    <div
                      key={img.id}
                      onClick={() => onViewImageClick(img)}
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
          {stayLogs?.map((stay: any) => (
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
                    onClick={() => onAddImageClick(stay.id)}
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

              {stay.images && stay.images.length > 0 && (
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  {stay.images.map((img: any) => (
                    <div
                      key={img.id}
                      onClick={() => onViewImageClick(img)}
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
  );
};
