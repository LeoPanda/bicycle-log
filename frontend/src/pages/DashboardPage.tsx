import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, MapPin, Mountain, RefreshCw, Trophy, ChevronRight, Calendar, X, CheckCircle2, Navigation as RouteIcon } from 'lucide-react';
import { api } from '../services/api';
import { DashboardSummary } from '../types';

type SyncPeriodOption = 'latest' | '1m' | '3m' | '6m' | '1y' | 'before_202509' | 'before_202410' | 'all';

export const DashboardPage: React.FC = () => {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [detectingRoutes, setDetectingRoutes] = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [syncPeriod, setSyncPeriod] = useState<SyncPeriodOption>('latest');
  const [syncResult, setSyncResult] = useState<{
    synced_activities: number;
    detected_stops: number;
    created_places: number;
  } | null>(null);

  const navigate = useNavigate();

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const res = await api.get<DashboardSummary>('/analytics/dashboard');
      setData(res);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const handleOpenSyncModal = () => {
    setSyncResult(null);
    setShowSyncModal(true);
  };

  const handleDetectRoutes = async () => {
    try {
      setDetectingRoutes(true);
      const res = await api.post<{
        status: string;
        detected_routes: number;
        grouped_activities: number;
      }>('/routes/detect');
      alert(`定番ルートの検出が完了しました。\n新規作成ルート: ${res.detected_routes} 件\n紐付けアクティビティ: ${res.grouped_activities} 件`);
      await fetchDashboard();
    } catch (err: any) {
      alert(`定番ルートの検出に失敗しました: ${err.message}`);
    } finally {
      setDetectingRoutes(false);
    }
  };

  const handleExecuteSync = async () => {
    try {
      setSyncing(true);
      setSyncResult(null);
      
      let url = '/strava/sync';
      if (syncPeriod === '1m') {
        url += '?limit_months=1';
      } else if (syncPeriod === '3m') {
        url += '?limit_months=3';
      } else if (syncPeriod === '6m') {
        url += '?limit_months=6';
      } else if (syncPeriod === '1y') {
        url += '?limit_months=12';
      } else if (syncPeriod === 'before_202509') {
        url += '?before_timestamp=1756681200';
      } else if (syncPeriod === 'before_202410') {
        url += '?before_timestamp=1730386800';
      } else if (syncPeriod === 'all') {
        url += '?all_time=true';
      }

      const res = await api.post<{
        status: string;
        synced_activities: number;
        detected_stops: number;
        created_places: number;
      }>(url);

      setSyncResult({
        synced_activities: res.synced_activities,
        detected_stops: res.detected_stops,
        created_places: res.created_places,
      });

      await fetchDashboard();
    } catch (err: any) {
      alert(`同期に失敗しました: ${err.message}`);
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-slate-500">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const summary = data?.summary;

  const periodOptions: { id: SyncPeriodOption; label: string; description: string }[] = [
    { id: 'latest', label: '前回同期以降（最新データのみ）', description: '前回登録した最新のライド以降のアクティビティを同期します' },
    { id: '1m', label: '直近 1 ヶ月', description: '過去30日間のアクティビティを同期対象にします' },
    { id: '3m', label: '直近 3 ヶ月', description: '過去90日間のアクティビティを同期対象にします' },
    { id: '6m', label: '直近 6 ヶ月', description: '過去180日間のアクティビティを同期対象にします' },
    { id: '1y', label: '直近 1 年 (12ヶ月)', description: '過去1年間のアクティビティを同期対象にします' },
    { id: 'before_202509', label: '2025年8月以前 (過去アクティビティ補完)', description: '2025年9月1日より前の過去アクティビティをまとめて同期・補完します' },
    { id: 'before_202410', label: '2024年10月以前 (過去アクティビティ補完)', description: '2024年11月1日より前の過去アクティビティをまとめて同期・補完します' },
    { id: 'all', label: '全期間 (全データ再取得)', description: 'Stravaアカウントに保存されている全データを取得・同期します' },
  ];

  return (
    <div className="space-y-8">
      {/* Top Banner / Sync */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 sm:p-8 text-white shadow-lg">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">ダッシュボード</h1>
          <p className="mt-1 text-blue-100 text-sm">
            走行アクティビティと15分以上の滞在記録の概要を表示しています。
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleDetectRoutes}
            disabled={detectingRoutes || syncing}
            title="定番ルートの検出"
            className="inline-flex items-center gap-2 bg-emerald-500/30 hover:bg-emerald-500/40 backdrop-blur-md text-white font-medium px-4 py-2.5 rounded-xl border border-emerald-400/40 transition disabled:opacity-50"
          >
            <RouteIcon className={`w-4 h-4 ${detectingRoutes ? 'animate-spin' : ''}`} />
            {detectingRoutes ? '検出中...' : '定番ルート検出'}
          </button>
          <button
            onClick={handleOpenSyncModal}
            disabled={syncing || detectingRoutes}
            title="Sync Strava"
            className="inline-flex items-center gap-2 bg-white/20 hover:bg-white/30 backdrop-blur-md text-white font-medium px-5 py-2.5 rounded-xl border border-white/30 transition disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? '同期中...' : 'Stravaデータ同期'}
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between text-blue-600 dark:text-blue-400">
            <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">総走行距離</span>
            <Activity className="w-5 h-5" />
          </div>
          <div className="mt-4 flex items-baseline gap-1">
            <span className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              {(summary?.total_distance_km ?? 0).toLocaleString()}
            </span>
            <span className="text-sm font-medium text-slate-500">km</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between text-indigo-600 dark:text-indigo-400">
            <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">総上昇量</span>
            <Mountain className="w-5 h-5" />
          </div>
          <div className="mt-4 flex items-baseline gap-1">
            <span className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              {(summary?.total_elevation_gain_m ?? 0).toLocaleString()}
            </span>
            <span className="text-sm font-medium text-slate-500">m</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
            <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">総ライド回数</span>
            <Trophy className="w-5 h-5" />
          </div>
          <div className="mt-4 flex items-baseline gap-1">
            <span className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              {summary?.total_ride_count}
            </span>
            <span className="text-sm font-medium text-slate-500">回</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between text-rose-600 dark:text-rose-400">
            <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">累積滞在スポット数</span>
            <MapPin className="w-5 h-5" />
          </div>
          <div className="mt-4 flex items-baseline gap-1">
            <span className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              {summary?.total_stay_spots}
            </span>
            <span className="text-sm font-medium text-slate-500">箇所</span>
          </div>
        </div>
      </div>

      {/* Main Content Grid: Recent Activities, Stay Spots Ranking, Standard Route Ranking */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activities */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-600" />
              直近のアクティビティ
            </h2>
            <button
              onClick={() => navigate('/items')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center gap-1"
            >
              すべて見る <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-3">
            {data?.recent_activities.map((act) => (
              <div
                key={act.id}
                onClick={() => navigate(`/items/${act.id}?type=activity`)}
                className="p-4 rounded-xl border border-slate-100 dark:border-slate-700/60 hover:bg-slate-50 dark:hover:bg-slate-700/40 cursor-pointer transition flex items-center justify-between"
              >
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">{act.name}</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    {new Date(act.start_date).toLocaleDateString('ja-JP')} • {act.bike_name}
                  </p>
                </div>
                <div className="text-right">
                  <span className="font-bold text-slate-900 dark:text-white text-sm block">
                    {act.distance_km} km
                  </span>
                  <span className="text-xs text-slate-400">+{act.elevation_gain} m</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Stay Spots Top 10 Ranking */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-500" />
              滞在記録ランキング Top 10
            </h2>
            <button
              onClick={() => navigate('/items?tab=places')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center gap-1"
            >
              スポット一覧 <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-3">
            {data?.ranking.map((item, idx) => (
              <div
                key={item.place_id}
                onClick={() => navigate(`/items/${item.place_id}?type=place`)}
                className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-700/60 hover:bg-slate-50 dark:hover:bg-slate-700/40 cursor-pointer transition flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`w-6 h-6 rounded-full font-extrabold text-xs flex items-center justify-center ${
                      idx === 0
                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                        : idx === 1
                        ? 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                        : idx === 2
                        ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300'
                        : 'text-slate-400'
                    }`}
                  >
                    {idx + 1}
                  </span>
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
                      {item.place_name}
                    </h3>
                    <span className="inline-block mt-0.5 px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                      {item.category_name}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-bold text-blue-600 dark:text-blue-400 text-sm block">
                    {item.visit_count} 回訪問
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Standard Routes Top 10 Ranking */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <RouteIcon className="w-5 h-5 text-purple-600" />
              定番ルート走行回数ランキング Top 10
            </h2>
            <button
              onClick={() => navigate('/master?tab=routes')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center gap-1"
            >
              ルート一覧 <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-3">
            {(!data?.route_ranking || data.route_ranking.length === 0) ? (
              <p className="text-xs text-slate-400 py-6 text-center">定番ルートデータが登録されていません</p>
            ) : (
              data.route_ranking.map((item, idx) => (
                <div
                  key={item.route_id}
                  onClick={() => navigate(`/master?tab=routes&route_id=${item.route_id}`)}
                  className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-700/60 hover:bg-slate-50 dark:hover:bg-slate-700/40 cursor-pointer transition flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-6 h-6 rounded-full font-extrabold text-xs flex items-center justify-center ${
                        idx === 0
                          ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300'
                          : idx === 1
                          ? 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                          : idx === 2
                          ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300'
                          : 'text-slate-400'
                      }`}
                    >
                      {idx + 1}
                    </span>
                    <div>
                      <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
                        {item.name}
                      </h3>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-purple-600 dark:text-purple-400 text-sm block">
                      {item.activity_count} 回走行
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Strava Sync Period Selection Modal */}
      {showSyncModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Strava同期期間の指定
                </h3>
              </div>
              <button
                onClick={() => !syncing && setShowSyncModal(false)}
                disabled={syncing}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              同期するアクティビティの対象期間を選択してください。期間内の新規アクティビティおよび滞在スポットが保存されます。
            </p>

            {/* Sync Result Banner */}
            {syncResult && (
              <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-emerald-700 dark:text-emerald-300 text-sm">
                  <CheckCircle2 className="w-4 h-4" />
                  同期が正常に完了しました
                </div>
                <p>・ 同期アクティビティ件数: <strong>{syncResult.synced_activities}</strong> 件</p>
                <p>・ 検出滞在ログ件数: <strong>{syncResult.detected_stops}</strong> 件</p>
                <p>・ 新規追加スポット数: <strong>{syncResult.created_places}</strong> 箇所</p>
              </div>
            )}

            {/* Period Selection Options */}
            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
              {periodOptions.map((opt) => (
                <label
                  key={opt.id}
                  className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition ${
                    syncPeriod === opt.id
                      ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/30 dark:border-blue-500'
                      : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/40'
                  }`}
                >
                  <input
                    type="radio"
                    name="syncPeriod"
                    value={opt.id}
                    checked={syncPeriod === opt.id}
                    onChange={() => setSyncPeriod(opt.id)}
                    disabled={syncing}
                    className="mt-0.5 text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <span className="block font-bold text-sm text-slate-900 dark:text-white">
                      {opt.label}
                    </span>
                    <span className="block text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {opt.description}
                    </span>
                  </div>
                </label>
              ))}
            </div>

            {/* Modal Actions */}
            <div className="flex justify-end gap-3 pt-2 border-t border-slate-100 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setShowSyncModal(false)}
                disabled={syncing}
                className="px-4 py-2.5 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition disabled:opacity-50"
              >
                {syncResult ? '閉じる' : 'キャンセル'}
              </button>
              <button
                type="button"
                onClick={handleExecuteSync}
                disabled={syncing}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition shadow-sm disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? '同期実行中...' : '同期を開始する'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

