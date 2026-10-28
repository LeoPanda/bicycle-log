import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Calendar, MapPin } from 'lucide-react';
import { DashboardSummary } from '../types';

interface RecentActivitiesListProps {
  recentActivities?: DashboardSummary['recent_activities'];
  ranking?: DashboardSummary['ranking'];
}

export const RecentActivitiesList: React.FC<RecentActivitiesListProps> = ({
  recentActivities = [],
  ranking = [],
}) => {
  const navigate = useNavigate();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Recent Activities */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-slate-900 dark:text-white">最近のアクティビティ</h3>
          <button
            onClick={() => navigate('/items?tab=activities')}
            className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
          >
            すべて見る <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="space-y-3">
          {recentActivities.map((act) => (
            <div
              key={act.id}
              onClick={() => navigate(`/items/${act.id}?type=activity`)}
              className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-900/40 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition cursor-pointer flex items-center justify-between"
            >
              <div>
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">{act.name}</h4>
                <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(act.start_date).toLocaleDateString('ja-JP')}
                  </span>
                  <span>•</span>
                  <span>{act.bike_name}</span>
                </div>
              </div>
              <div className="text-right">
                <p className="font-mono font-bold text-sm text-slate-900 dark:text-white">{act.distance_km} km</p>
                <p className="text-xs text-slate-400">+{act.elevation_gain} m</p>
              </div>
            </div>
          ))}
          {recentActivities.length === 0 && (
            <p className="text-center py-8 text-slate-400 text-xs">アクティビティがありません</p>
          )}
        </div>
      </div>

      {/* Top Visited Places */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-slate-900 dark:text-white">よく訪れる滞在スポット TOP 10</h3>
          <button
            onClick={() => navigate('/items?tab=places')}
            className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
          >
            すべて見る <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
          {ranking.map((spot, index) => (
            <div
              key={spot.place_id}
              onClick={() => navigate(`/items/${spot.place_id}?type=place`)}
              className="p-3 rounded-xl border border-slate-100 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-900/40 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition cursor-pointer flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <span className="w-6 text-center font-black text-xs text-slate-400">
                  {index + 1}
                </span>
                <div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">{spot.place_name}</h4>
                  <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3 h-3" />
                    {spot.category_name}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                  {spot.visit_count} 回訪問
                </span>
              </div>
            </div>
          ))}
          {ranking.length === 0 && (
            <p className="text-center py-8 text-slate-400 text-xs">訪問スポットがありません</p>
          )}
        </div>
      </div>
    </div>
  );
};
