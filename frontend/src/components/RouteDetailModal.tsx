import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Navigation as RouteIcon, X, ExternalLink, RefreshCw, Pencil, Check } from 'lucide-react';
import { useRouteDetail } from '../hooks/useRouteDetail';

interface RouteDetailModalProps {
  routeId: number | null;
  onClose: () => void;
  onUpdated?: () => void;
}

export const RouteDetailModal: React.FC<RouteDetailModalProps> = ({ routeId, onClose, onUpdated }) => {
  const navigate = useNavigate();
  const {
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
  } = useRouteDetail(routeId, onUpdated);

  if (!routeId) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-3xl w-full p-6 shadow-2xl space-y-5 border border-slate-200 dark:border-slate-700 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <RouteIcon className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
            {loading ? (
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">読み込み中...</h3>
            ) : routeDetail ? (
              isEditingName ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={editingNameValue}
                    onChange={(e) => setEditingNameValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveName();
                      if (e.key === 'Escape') handleCancelEditName();
                    }}
                    autoFocus
                    className="px-2.5 py-1 border border-blue-400 rounded-lg text-sm bg-white dark:bg-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
                  />
                  <button
                    onClick={handleSaveName}
                    disabled={savingName}
                    title="保存"
                    className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleCancelEditName}
                    disabled={savingName}
                    title="キャンセル"
                    className="p-1.5 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-semibold hover:bg-slate-300 transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 group cursor-pointer" onClick={handleStartEditName} title="クリックして定番ルート名を編集">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition flex items-center gap-1.5">
                    {routeDetail.name}
                    <Pencil className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition text-slate-400 group-hover:text-blue-600" />
                  </h3>
                  <span className="text-xs text-slate-400 font-normal">#{routeDetail.id}</span>
                </div>
              )
            ) : (
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">定番ルート詳細</h3>
            )}
          </div>
          <button onClick={onClose} title="Close" className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMessage && (
          <div className="p-3 bg-rose-50 text-rose-700 rounded-xl text-xs">
            {errorMessage}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : routeDetail ? (
          <>
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-600 dark:text-slate-400">代表コース Polyline プレビュー</span>
              <div className="w-full h-64 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden relative shadow-inner z-0">
                <div ref={routeMapRef} className="w-full h-full" />
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  走行アクティビティ一覧 ({routeDetail.activities?.length || 0} 件)
                </h4>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {routeDetail.activities && routeDetail.activities.length > 0 ? (
                  routeDetail.activities.map((act) => (
                    <div key={act.id} className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/40 flex items-center justify-between">
                      <div>
                        <h5 className="font-bold text-slate-900 dark:text-white text-xs">{act.name}</h5>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {new Date(act.start_date).toLocaleDateString('ja-JP')} • {act.distance_km} km
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            navigate(`/items/${act.id}?type=activity`);
                          }}
                          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition"
                        >
                          アクティビティ詳細
                        </button>
                        {act.strava_url && (
                          <a
                            href={act.strava_url}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 rounded-lg border border-orange-200 text-orange-600 hover:bg-orange-50 transition"
                            title="Strava"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center py-4 text-slate-400 text-xs">紐付いているアクティビティがありません</p>
                )}
              </div>
            </div>
          </>
        ) : null}

        <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-700">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold hover:bg-slate-300 transition"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
};
