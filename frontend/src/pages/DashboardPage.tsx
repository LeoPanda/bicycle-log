import React from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCw, Search, Loader2, MapPin, Navigation as RouteIcon } from 'lucide-react';
import { useDashboard } from '../hooks/useDashboard';
import { SummaryStatsGrid } from '../components/SummaryStatsGrid';
import { RecentActivitiesList } from '../components/RecentActivitiesList';
import { QuickSyncWidget } from '../components/QuickSyncWidget';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    data,
    loading,
    syncing,
    detectingRoutes,
    backfillingEndpoints,
    showSyncModal,
    setShowSyncModal,
    syncPeriod,
    setSyncPeriod,
    syncResult,
    searchQuery,
    setSearchQuery,
    searchResults,
    isSearching,
    showDropdown,
    setShowDropdown,
    searchContainerRef,
    handleBackfillEndpoints,
    handleExecuteSync,
    handleDetectRoutes,
  } = useDashboard();

  return (
    <div className="space-y-6">
      {/* Top Header & Search Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">ダッシュボード</h1>
          <p className="text-xs text-slate-500 mt-0.5">サイクリングログ＆滞在スポットの全体概要</p>
        </div>

        {/* Global Fuzzy Search Input */}
        <div ref={searchContainerRef} className="relative w-full lg:w-96">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="スポット・定番ルートを横断検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => {
                if (searchResults) setShowDropdown(true);
              }}
              className="w-full pl-10 pr-9 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white placeholder-slate-400"
            />
            {isSearching && (
              <Loader2 className="w-4 h-4 text-blue-500 animate-spin absolute right-3 top-1/2 -translate-y-1/2" />
            )}
          </div>

          {/* Search Dropdown */}
          {showDropdown && searchResults && (
            <div className="absolute left-0 right-0 top-full mt-2 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 z-50 max-h-96 overflow-y-auto p-2">
              <div className="p-2 text-xs font-bold text-slate-400 uppercase tracking-wider">滞在スポット</div>
              {searchResults.places.length > 0 ? (
                searchResults.places.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => {
                      setShowDropdown(false);
                      navigate(`/items/${p.id}?type=place`);
                    }}
                    className="p-2.5 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-xl cursor-pointer flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-blue-500" />
                      <span className="font-bold text-slate-900 dark:text-white">{p.name}</span>
                    </div>
                    <span className="text-slate-400 text-[10px]">{p.category_name}</span>
                  </div>
                ))
              ) : (
                <p className="px-3 py-2 text-xs text-slate-400">該当するスポットはありません</p>
              )}

              <div className="p-2 text-xs font-bold text-slate-400 uppercase tracking-wider border-t border-slate-100 dark:border-slate-700 mt-2">定番ルート</div>
              {searchResults.routes.length > 0 ? (
                searchResults.routes.map((r) => (
                  <div
                    key={r.id}
                    onClick={() => {
                      setShowDropdown(false);
                      navigate('/analytics');
                    }}
                    className="p-2.5 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-xl cursor-pointer flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <RouteIcon className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="font-bold text-slate-900 dark:text-white">{r.name}</span>
                    </div>
                    <span className="text-slate-400 text-[10px]">{r.activity_count} ライド</span>
                  </div>
                ))
              ) : (
                <p className="px-3 py-2 text-xs text-slate-400">該当するルートはありません</p>
              )}
            </div>
          )}
        </div>

        <QuickSyncWidget
          showSyncModal={showSyncModal}
          setShowSyncModal={setShowSyncModal}
          syncPeriod={syncPeriod}
          setSyncPeriod={setSyncPeriod}
          syncing={syncing}
          detectingRoutes={detectingRoutes}
          backfillingEndpoints={backfillingEndpoints}
          syncResult={syncResult}
          handleExecuteSync={handleExecuteSync}
          handleDetectRoutes={handleDetectRoutes}
          handleBackfillEndpoints={handleBackfillEndpoints}
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : (
        <div className="space-y-6">
          <SummaryStatsGrid summary={data?.summary} />
          <RecentActivitiesList
            recentActivities={data?.recent_activities}
            ranking={data?.ranking}
          />
        </div>
      )}
    </div>
  );
};
