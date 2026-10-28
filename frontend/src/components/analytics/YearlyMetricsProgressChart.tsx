import React from 'react';
import { Activity } from 'lucide-react';
import { AnalyticsMetric } from '../../types';
import { MetricTab } from '../../hooks/useAnalytics';

interface YearlyMetricsProgressChartProps {
  metrics: AnalyticsMetric[];
  selectedMetricTab: MetricTab;
  setSelectedMetricTab: (tab: MetricTab) => void;
}

export const YearlyMetricsProgressChart: React.FC<YearlyMetricsProgressChartProps> = ({
  metrics,
  selectedMetricTab,
  setSelectedMetricTab,
}) => {
  const getMetricValue = (m: AnalyticsMetric, tab: MetricTab) => {
    switch (tab) {
      case 'distance': return m.distance_km || 0;
      case 'elevation': return m.elevation_m || 0;
      case 'time': return m.moving_hours || 0;
      case 'rides': return m.ride_count || 0;
      case 'calories': return m.calories_kcal || 0;
      default: return 0;
    }
  };

  const getMetricUnit = (tab: MetricTab) => {
    switch (tab) {
      case 'distance': return 'km';
      case 'elevation': return 'm';
      case 'time': return 'h';
      case 'rides': return '回';
      case 'calories': return 'kcal';
      default: return '';
    }
  };

  const tabs: Array<{ id: MetricTab; label: string }> = [
    { id: 'distance', label: '走行距離 (km)' },
    { id: 'elevation', label: '獲得標高 (m)' },
    { id: 'time', label: '移動時間 (h)' },
    { id: 'rides', label: '回数 (回)' },
    { id: 'calories', label: 'カロリー (kcal)' },
  ];

  const maxVal = Math.max(...metrics.map((m) => getMetricValue(m, selectedMetricTab)), 1);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700/80 p-5 sm:p-7 shadow-sm space-y-6">
      {/* Header with Title and Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-1">
        <div className="flex items-center gap-2.5">
          <Activity className="w-5 h-5 text-blue-600" />
          <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
            期間別走行メトリクス可視化
          </h2>
        </div>

        {/* Tab Pills */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-700/50 p-1 rounded-2xl overflow-x-auto">
          {tabs.map((t) => {
            const isActive = selectedMetricTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setSelectedMetricTab(t.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                  isActive
                    ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Progress Bars by Year */}
      <div className="space-y-3.5 pt-2">
        {metrics.map((m) => {
          const val = getMetricValue(m, selectedMetricTab);
          const percent = Math.min(Math.max((val / maxVal) * 100, val > 0 ? 3 : 0), 100);
          const unit = getMetricUnit(selectedMetricTab);
          const formattedVal = val.toLocaleString(undefined, {
            minimumFractionDigits: selectedMetricTab === 'rides' ? 0 : 2,
            maximumFractionDigits: 2,
          });

          return (
            <div key={m.period} className="flex items-center gap-3 sm:gap-4">
              {/* Year Label */}
              <div className="w-16 sm:w-20 text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200 shrink-0">
                {m.period}
              </div>

              {/* Capsule Progress Bar */}
              <div className="flex-1 bg-slate-100 dark:bg-slate-700/50 rounded-full h-7 relative flex items-center overflow-hidden">
                <div
                  style={{ width: `${percent}%` }}
                  className="bg-blue-600 h-full rounded-full flex items-center justify-end px-3 transition-all duration-300 shrink-0"
                >
                  {percent >= 18 && (
                    <span className="text-[11px] font-bold text-white whitespace-nowrap">
                      {val.toFixed(2)} {unit}
                    </span>
                  )}
                </div>
              </div>

              {/* Right Value Display */}
              <div className="w-24 sm:w-28 text-right text-xs sm:text-sm font-bold text-slate-900 dark:text-white shrink-0">
                {formattedVal} {unit}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
