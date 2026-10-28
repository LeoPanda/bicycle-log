import React from 'react';
import { AnalyticsMetric } from '../../types';

interface RideSummaryTableProps {
  metrics: AnalyticsMetric[];
}

export const RideSummaryTable: React.FC<RideSummaryTableProps> = ({ metrics }) => {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
      <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700">
        <h3 className="font-bold text-sm text-slate-900 dark:text-white">期間別詳細サマリ</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
          <thead className="bg-slate-50 dark:bg-slate-900/50 text-xs font-semibold text-slate-500 uppercase border-b border-slate-200 dark:border-slate-700">
            <tr>
              <th className="px-6 py-3.5">期間</th>
              <th className="px-6 py-3.5">走行距離</th>
              <th className="px-6 py-3.5">獲得標高</th>
              <th className="px-6 py-3.5">走行時間</th>
              <th className="px-6 py-3.5">ライド回数</th>
              <th className="px-6 py-3.5">消費カロリー</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 font-mono text-xs">
            {metrics.map((m) => (
              <tr key={m.period} className="hover:bg-slate-50/80 dark:hover:bg-slate-700/30 transition">
                <td className="px-6 py-3.5 font-bold text-slate-900 dark:text-white font-sans">{m.period}</td>
                <td className="px-6 py-3.5 font-bold text-blue-600 dark:text-blue-400">{m.distance_km.toFixed(1)} km</td>
                <td className="px-6 py-3.5">+{m.elevation_m.toLocaleString()} m</td>
                <td className="px-6 py-3.5">{m.moving_hours.toFixed(1)} 時間</td>
                <td className="px-6 py-3.5">{m.ride_count} 回</td>
                <td className="px-6 py-3.5">{m.calories_kcal ? `${Math.round(m.calories_kcal).toLocaleString()} kcal` : '-'}</td>
              </tr>
            ))}
            {metrics.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-6 text-slate-400 font-sans text-xs">データがありません</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
