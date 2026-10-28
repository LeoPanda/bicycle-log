import React from 'react';
import { RefreshCw, X, CheckCircle2, Navigation as RouteIcon, MapPin } from 'lucide-react';
import { SyncPeriodOption } from '../hooks/useDashboard';

interface QuickSyncWidgetProps {
  showSyncModal: boolean;
  setShowSyncModal: (show: boolean) => void;
  syncPeriod: SyncPeriodOption;
  setSyncPeriod: (period: SyncPeriodOption) => void;
  syncing: boolean;
  detectingRoutes: boolean;
  backfillingEndpoints: boolean;
  syncResult: {
    synced_activities: number;
    detected_stops: number;
    created_places: number;
  } | null;
  handleExecuteSync: () => void;
  handleDetectRoutes: () => void;
  handleBackfillEndpoints: () => void;
}

export const QuickSyncWidget: React.FC<QuickSyncWidgetProps> = ({
  showSyncModal,
  setShowSyncModal,
  syncPeriod,
  setSyncPeriod,
  syncing,
  detectingRoutes,
  backfillingEndpoints,
  syncResult,
  handleExecuteSync,
  handleDetectRoutes,
  handleBackfillEndpoints,
}) => {
  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setShowSyncModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
        >
          <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
          Stravaから同期
        </button>

        <button
          onClick={handleDetectRoutes}
          disabled={detectingRoutes}
          className="flex items-center gap-2 px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition border border-slate-200 dark:border-slate-700 disabled:opacity-50"
        >
          <RouteIcon className={`w-4 h-4 text-blue-500 ${detectingRoutes ? 'animate-spin' : ''}`} />
          定番ルート検出
        </button>

        <button
          onClick={handleBackfillEndpoints}
          disabled={backfillingEndpoints}
          className="flex items-center gap-2 px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition border border-slate-200 dark:border-slate-700 disabled:opacity-50"
        >
          <MapPin className={`w-4 h-4 text-emerald-500 ${backfillingEndpoints ? 'animate-spin' : ''}`} />
          発着点一括検出
        </button>
      </div>

      {/* Sync Modal */}
      {showSyncModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-orange-600" />
                Stravaアクティビティ同期
              </h3>
              <button onClick={() => setShowSyncModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {syncResult ? (
              <div className="space-y-4 py-2">
                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 rounded-xl flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-sm text-emerald-900 dark:text-emerald-100">同期が完了しました</h4>
                    <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-1">
                      アクティビティ: {syncResult.synced_activities} 件<br />
                      検出滞在スポット: {syncResult.detected_stops} 件
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowSyncModal(false)}
                  className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold"
                >
                  閉じる
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-xs text-slate-500">
                  同期するアクティビティの取得範囲を選択してください。
                </p>

                <div className="space-y-2">
                  {[
                    { id: 'latest', label: '最新の差分のみ (最新アクティビティ以降)' },
                    { id: '1m', label: '過去1ヶ月間' },
                    { id: '3m', label: '過去3ヶ月間' },
                    { id: '1y', label: '過去1年間' },
                    { id: 'all', label: '全期間（全アクティビティ）' },
                  ].map((opt) => (
                    <label
                      key={opt.id}
                      className={`flex items-center gap-3 p-3 rounded-xl border text-xs font-semibold cursor-pointer transition ${
                        syncPeriod === opt.id
                          ? 'border-orange-500 bg-orange-50/50 dark:bg-orange-950/20 text-orange-900 dark:text-orange-200'
                          : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="syncPeriod"
                        value={opt.id}
                        checked={syncPeriod === opt.id}
                        onChange={() => setSyncPeriod(opt.id as SyncPeriodOption)}
                        className="text-orange-600 focus:ring-orange-500"
                      />
                      {opt.label}
                    </label>
                  ))}
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => setShowSyncModal(false)}
                    className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
                  >
                    キャンセル
                  </button>
                  <button
                    onClick={handleExecuteSync}
                    disabled={syncing}
                    className="flex-1 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold transition disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {syncing ? <RefreshCw className="w-4 h-4 animate-spin" /> : null}
                    {syncing ? '同期中...' : '同期を実行'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};
