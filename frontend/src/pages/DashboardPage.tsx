import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, MapPin, Mountain, RefreshCw, Trophy, ChevronRight } from 'lucide-react';
import { api } from '../services/api';
import { DashboardSummary } from '../types';

export const DashboardPage: React.FC = () => {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
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

  const handleSyncStrava = async () => {
    try {
      setSyncing(true);
      await api.post('/strava/sync');
      await fetchDashboard();
    } catch (err: any) {
      alert(`Sync failed: ${err.message}`);
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

  return (
    <div className="space-y-8">
      {/* Top Banner / Sync */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 sm:p-8 text-white shadow-lg">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">ダッシュボード</h1>
          <p className="mt-1 text-blue-100 text-sm">
            走行アクティビティと30分以上の滞在記録の概要を表示しています。
          </p>
        </div>
        <button
          onClick={handleSyncStrava}
          disabled={syncing}
          title="Sync Strava"
          className="inline-flex items-center gap-2 bg-white/20 hover:bg-white/30 backdrop-blur-md text-white font-medium px-5 py-2.5 rounded-xl border border-white/30 transition disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
          {syncing ? '同期中...' : 'Stravaデータ同期'}
        </button>
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
              {summary?.total_distance_km.toLocaleString()}
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
              {summary?.total_elevation_gain_m.toLocaleString()}
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

      {/* Main Content Grid: Recent Activities & Ranking */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
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
      </div>
    </div>
  );
};
