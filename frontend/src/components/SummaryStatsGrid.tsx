import React from 'react';
import { Activity, MapPin, Mountain, Trophy } from 'lucide-react';
import { DashboardSummary } from '../types';

interface SummaryStatsGridProps {
  summary?: DashboardSummary['summary'];
}

export const SummaryStatsGrid: React.FC<SummaryStatsGridProps> = ({ summary }) => {
  if (!summary) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between">
        <div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">総走行距離</p>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            {summary.total_distance_km.toLocaleString()} <span className="text-xs font-normal text-slate-400">km</span>
          </p>
        </div>
        <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
          <Activity className="w-6 h-6" />
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between">
        <div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">総獲得標高</p>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            +{summary.total_elevation_gain_m.toLocaleString()} <span className="text-xs font-normal text-slate-400">m</span>
          </p>
        </div>
        <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
          <Mountain className="w-6 h-6" />
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between">
        <div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">総ライド回数</p>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            {summary.total_ride_count} <span className="text-xs font-normal text-slate-400">回</span>
          </p>
        </div>
        <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-400">
          <Trophy className="w-6 h-6" />
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between">
        <div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">訪問スポット数</p>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            {summary.total_stay_spots} <span className="text-xs font-normal text-slate-400">箇所</span>
          </p>
        </div>
        <div className="w-12 h-12 rounded-xl bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400">
          <MapPin className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
};
