import React from 'react';
import { AnalyticsMetric } from '../../types';
import { MetricTab } from '../../hooks/useAnalytics';

interface MonthlyDistanceChartProps {
  metrics: AnalyticsMetric[];
  selectedMetricTab: MetricTab;
  setSelectedMetricTab: (tab: MetricTab) => void;
}

export const MonthlyDistanceChart: React.FC<MonthlyDistanceChartProps> = ({
  metrics,
  selectedMetricTab,
  setSelectedMetricTab,
}) => {
  const getMetricValue = (m: AnalyticsMetric, tab: MetricTab) => {
    switch (tab) {
      case 'distance': return m.distance_km;
      case 'elevation': return m.elevation_m;
      case 'time': return m.moving_hours;
      case 'rides': return m.ride_count;
      case 'calories': return m.calories_kcal;
      default: return 0;
    }
  };

  const getMetricUnit = (tab: MetricTab) => {
    switch (tab) {
      case 'distance': return 'km';
      case 'elevation': return 'm';
      case 'time': return '時間';
      case 'rides': return '回';
      case 'calories': return 'kcal';
      default: return '';
    }
  };

  const maxVal = Math.max(...metrics.map((m) => getMetricValue(m, selectedMetricTab)), 1);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm space-y-4">
      {/* Metric Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-100 dark:border-slate-700/60 pb-3">
        {[
          { id: 'distance', label: '走行距離' },
          { id: 'elevation', label: '獲得標高' },
          { id: 'time', label: '走行時間' },
          { id: 'rides', label: 'ライド回数' },
          { id: 'calories', label: '消費カロリー' },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setSelectedMetricTab(t.id as MetricTab)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              selectedMetricTab === t.id
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Bar Chart */}
      <div className="pt-2">
        <div className="flex items-end gap-2 h-56 overflow-x-auto pb-4 pt-6">
          {metrics.map((m) => {
            const val = getMetricValue(m, selectedMetricTab);
            const heightPercent = Math.max(Math.round((val / maxVal) * 100), 2);
            return (
              <div key={m.period} className="flex-1 min-w-[48px] flex flex-col items-center gap-2 group">
                <span className="text-[10px] font-mono font-bold text-slate-500 opacity-0 group-hover:opacity-100 transition whitespace-nowrap">
                  {val.toLocaleString()} {getMetricUnit(selectedMetricTab)}
                </span>
                <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-t-lg h-full flex items-end overflow-hidden">
                  <div
                    style={{ height: `${heightPercent}%` }}
                    className="w-full bg-gradient-to-t from-blue-600 to-indigo-500 group-hover:from-blue-500 group-hover:to-indigo-400 rounded-t-lg transition-all duration-300"
                  />
                </div>
                <span className="text-[11px] font-medium text-slate-400 whitespace-nowrap">
                  {m.period}
                </span>
              </div>
            );
          })}
          {metrics.length === 0 && (
            <div className="w-full flex items-center justify-center text-slate-400 text-xs">
              対象データがありません
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
