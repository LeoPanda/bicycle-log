import React from 'react';
import { Navigation as RouteIcon, ChevronRight } from 'lucide-react';
import { HeatmapRoute } from '../../hooks/useAnalytics';

interface HeatmapRoutesTableProps {
  routes: HeatmapRoute[];
  onSelectRoute: (route: HeatmapRoute) => void;
}

export const HeatmapRoutesTable: React.FC<HeatmapRoutesTableProps> = ({
  routes,
  onSelectRoute,
}) => {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700/80 p-5 sm:p-7 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/60 pb-3">
        <div className="flex items-center gap-2">
          <RouteIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            定番ルート一覧
          </h3>
          <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
            {routes.length} 件
          </span>
        </div>
      </div>

      {routes.length === 0 ? (
        <p className="text-center py-8 text-xs font-semibold text-slate-400">
          現在登録されている定番ルートはありません。「定番ルート自動検出」を実行すると、類似した走行ログがここにグループ化されます。
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
          {routes.map((r) => (
            <div
              key={r.route_id}
              onClick={() => onSelectRoute(r)}
              className="group p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700 hover:border-emerald-500/50 bg-slate-50/50 dark:bg-slate-800/60 hover:bg-white dark:hover:bg-slate-750 transition-all cursor-pointer shadow-none hover:shadow-md flex items-center justify-between"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 transition">
                    {r.name}
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  走行回数: <span className="font-bold text-slate-700 dark:text-slate-300">{r.activity_count}</span> 回
                </p>
              </div>

              <div className="flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 opacity-80 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all">
                詳細
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
