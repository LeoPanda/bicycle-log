import React, { useEffect, useState } from 'react';
import { BarChart2, Calendar, MapPin, ExternalLink, RefreshCw, Activity as ActivityIcon } from 'lucide-react';
import { api } from '../services/api';
import { AnalyticsMetric, Bike } from '../types';

export const AnalyticsPage: React.FC = () => {
  const [rangeType, setRangeType] = useState<'annual' | 'monthly' | 'weekly'>('monthly');
  const [bikeId, setBikeId] = useState<string>('');
  
  const [metrics, setMetrics] = useState<AnalyticsMetric[]>([]);
  const [bikes, setBikes] = useState<Bike[]>([]);
  const [heatmapData, setHeatmapData] = useState<{ polylines: any[]; markers: any[] }>({ polylines: [], markers: [] });
  
  const [selectedPolyline, setSelectedPolyline] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get<Bike[]>('/bikes').then(setBikes).catch(console.error);
    api.get<any>('/analytics/heatmap').then(setHeatmapData).catch(console.error);
  }, []);

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({
        range_type: rangeType,
        ...(bikeId ? { bike_id: bikeId } : {})
      });
      const res: any = await api.get(`/analytics/metrics?${query.toString()}`);
      setMetrics(res.metrics);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, [rangeType, bikeId]);

  return (
    <div className="space-y-8">
      {/* Time Range Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-700">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <BarChart2 className="w-6 h-6 text-blue-600" />
            可視化 / 分析
          </h1>
          <p className="text-xs text-slate-500 mt-1">走行メトリクス集計および Polyline ヒートマップ描画</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <button
              onClick={() => setRangeType('annual')}
              className={`px-3.5 py-1.5 rounded-lg font-bold text-xs transition ${
                rangeType === 'annual'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              年間
            </button>
            <button
              onClick={() => setRangeType('monthly')}
              className={`px-3.5 py-1.5 rounded-lg font-bold text-xs transition ${
                rangeType === 'monthly'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              月間
            </button>
            <button
              onClick={() => setRangeType('weekly')}
              className={`px-3.5 py-1.5 rounded-lg font-bold text-xs transition ${
                rangeType === 'weekly'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              週間
            </button>
          </div>

          <select
            value={bikeId}
            onChange={(e) => setBikeId(e.target.value)}
            className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">すべての自転車</option>
            {bikes.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Metrics Bar Charts */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-6">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <ActivityIcon className="w-5 h-5 text-indigo-600" /> 期間別走行メトリクス
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Distance Chart Bar Representation */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700/60 space-y-3">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                走行距離 (km)
              </span>
              <div className="space-y-2">
                {metrics.map((m) => (
                  <div key={m.period} className="flex items-center gap-3 text-xs">
                    <span className="w-16 font-mono font-medium text-slate-600 dark:text-slate-400">{m.period}</span>
                    <div className="flex-1 bg-slate-200 dark:bg-slate-700 h-4 rounded-full overflow-hidden">
                      <div
                        className="bg-blue-600 h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, (m.distance_km / 300) * 100)}%` }}
                      />
                    </div>
                    <span className="w-16 font-bold text-slate-900 dark:text-white text-right">{m.distance_km} km</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Elevation Chart Bar Representation */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700/60 space-y-3">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                獲得標高 (m)
              </span>
              <div className="space-y-2">
                {metrics.map((m) => (
                  <div key={m.period} className="flex items-center gap-3 text-xs">
                    <span className="w-16 font-mono font-medium text-slate-600 dark:text-slate-400">{m.period}</span>
                    <div className="flex-1 bg-slate-200 dark:bg-slate-700 h-4 rounded-full overflow-hidden">
                      <div
                        className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, (m.elevation_m / 3000) * 100)}%` }}
                      />
                    </div>
                    <span className="w-16 font-bold text-slate-900 dark:text-white text-right">+{m.elevation_m} m</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Polyline Heatmap Section */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <MapPin className="w-5 h-5 text-rose-500" /> Polyline ヒートマップ
          </h2>
          <span className="text-xs text-slate-400">重複ルート一本化表示</span>
        </div>

        <div className="w-full h-96 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 overflow-hidden relative">
          <iframe
            title="Polyline Heatmap Map"
            width="100%"
            height="100%"
            frameBorder="0"
            src="https://maps.google.com/maps?q=35.3039,139.5015&z=11&output=embed"
          />
        </div>

        {/* Passed Activities List */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">
            通過アクティビティ一覧（クリック・選択）
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {heatmapData.polylines.map((poly) => (
              <div
                key={poly.activity_id}
                onClick={() => setSelectedPolyline(poly)}
                className={`p-4 rounded-xl border cursor-pointer transition flex items-center justify-between ${
                  selectedPolyline?.activity_id === poly.activity_id
                    ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/30'
                    : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/40'
                }`}
              >
                <div>
                  <h4 className="font-semibold text-slate-900 dark:text-white text-sm">{poly.name}</h4>
                  <p className="text-xs text-slate-400 mt-1">
                    {new Date(poly.start_date).toLocaleDateString('ja-JP')}
                  </p>
                </div>
                <a
                  href={poly.strava_url}
                  target="_blank"
                  rel="noreferrer"
                  title="Strava Activity"
                  onClick={(e) => e.stopPropagation()}
                  className="p-2 rounded-lg border border-orange-200 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950/40 transition"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
