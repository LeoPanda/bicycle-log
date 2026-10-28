import React, { useState } from 'react';
import { RefreshCw, Filter } from 'lucide-react';
import { useAnalytics, HeatmapRoute } from '../hooks/useAnalytics';
import { MonthlyDistanceChart } from '../components/analytics/MonthlyDistanceChart';
import { RideSummaryTable } from '../components/analytics/RideSummaryTable';
import { HeatmapMapSection } from '../components/analytics/HeatmapMapSection';
import { RouteDetailModal } from '../components/RouteDetailModal';

export const AnalyticsPage: React.FC = () => {
  const {
    rangeType,
    setRangeType,
    bikeId,
    setBikeId,
    selectedMetricTab,
    setSelectedMetricTab,
    metrics,
    bikes,
    availableYears,
    selectedYear,
    heatmapData,
    showSpots,
    setShowSpots,
    isGrayscale,
    setIsGrayscale,
    isFullscreenMap,
    setIsFullscreenMap,
    loadingMetrics,
    handleYearChange,
  } = useAnalytics();

  const [viewRouteId, setViewRouteId] = useState<number | null>(null);

  const handleSelectRoute = (route: HeatmapRoute) => {
    setViewRouteId(route.route_id);
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Range Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">アクティビティ分析</h1>
          <p className="text-xs text-slate-500 mt-0.5">走行ログの定量的統計と走行軌跡ヒートマップ</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Time Range Filter */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            {[
              { id: 'annual', label: '年別' },
              { id: 'monthly', label: '月別' },
              { id: 'weekly', label: '週別' },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setRangeType(t.id as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  rangeType === t.id
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Bike Filter */}
          <div className="flex items-center gap-1.5">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={bikeId}
              onChange={(e) => setBikeId(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold"
            >
              <option value="">すべての自転車</option>
              {bikes.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {loadingMetrics ? (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : (
        <div className="space-y-6">
          <MonthlyDistanceChart
            metrics={metrics}
            selectedMetricTab={selectedMetricTab}
            setSelectedMetricTab={setSelectedMetricTab}
          />

          <RideSummaryTable metrics={metrics} />

          <HeatmapMapSection
            heatmapData={heatmapData}
            availableYears={availableYears}
            selectedYear={selectedYear}
            onYearChange={handleYearChange}
            showSpots={showSpots}
            setShowSpots={setShowSpots}
            isGrayscale={isGrayscale}
            setIsGrayscale={setIsGrayscale}
            isFullscreenMap={isFullscreenMap}
            setIsFullscreenMap={setIsFullscreenMap}
            onSelectRoute={handleSelectRoute}
          />
        </div>
      )}

      {viewRouteId && (
        <RouteDetailModal
          routeId={viewRouteId}
          onClose={() => setViewRouteId(null)}
        />
      )}
    </div>
  );
};
