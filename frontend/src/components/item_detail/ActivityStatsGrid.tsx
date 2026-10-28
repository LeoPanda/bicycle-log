import React from 'react';
import { Pencil } from 'lucide-react';

interface ActivityStatsGridProps {
  item: any;
  onOpenBikeModal: () => void;
}

export const ActivityStatsGrid: React.FC<ActivityStatsGridProps> = ({
  item,
  onOpenBikeModal,
}) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-100 dark:border-slate-700">
      <div>
        <span className="text-xs text-slate-400 font-medium block">走行距離</span>
        <span className="text-xl font-bold text-slate-900 dark:text-white">
          {(item.distance / 1000).toFixed(1)} km
        </span>
      </div>
      <div>
        <span className="text-xs text-slate-400 font-medium block">獲得標高</span>
        <span className="text-xl font-bold text-slate-900 dark:text-white">
          +{item.total_elevation_gain} m
        </span>
      </div>
      <div
        onClick={onOpenBikeModal}
        className="group cursor-pointer p-2 -m-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700/60 transition"
        title="クリックして自転車を再選択"
      >
        <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
          使用自転車
          <Pencil className="w-3 h-3 text-slate-400 opacity-60 group-hover:opacity-100 group-hover:text-blue-600 transition" />
        </span>
        <span className="text-xl font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition">
          {item.bike_name || '未設定'}
        </span>
      </div>
      <div>
        <span className="text-xs text-slate-400 font-medium block">実施日時</span>
        <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
          {new Date(item.start_date).toLocaleString('ja-JP')}
        </span>
      </div>
    </div>
  );
};
