import React from 'react';
import { Activity, Mountain, Clock, Trophy, Flame } from 'lucide-react';
import { AnalyticsMetric } from '../../types';

interface MetricCardsSectionProps {
  metrics: AnalyticsMetric[];
}

export const MetricCardsSection: React.FC<MetricCardsSectionProps> = ({ metrics }) => {
  const totals = metrics.reduce(
    (acc, m) => {
      acc.distance += m.distance_km || 0;
      acc.elevation += m.elevation_m || 0;
      acc.time += m.moving_hours || 0;
      acc.rides += m.ride_count || 0;
      acc.calories += m.calories_kcal || 0;
      return acc;
    },
    { distance: 0, elevation: 0, time: 0, rides: 0, calories: 0 }
  );

  const cards = [
    {
      id: 'distance',
      label: '走行距離',
      value: totals.distance.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
      unit: 'km',
      icon: Activity,
      iconColor: 'text-blue-500',
    },
    {
      id: 'elevation',
      label: '獲得標高',
      value: `+${totals.elevation.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}`,
      unit: 'm',
      icon: Mountain,
      iconColor: 'text-indigo-500',
    },
    {
      id: 'time',
      label: '移動時間',
      value: totals.time.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
      unit: '時間',
      icon: Clock,
      iconColor: 'text-amber-500',
    },
    {
      id: 'rides',
      label: 'ライド回数',
      value: totals.rides.toLocaleString(),
      unit: '回',
      icon: Trophy,
      iconColor: 'text-emerald-500',
    },
    {
      id: 'calories',
      label: '消費カロリー',
      value: totals.calories.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
      unit: 'kcal',
      icon: Flame,
      iconColor: 'text-rose-500',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <div
            key={c.id}
            className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/80 p-4 sm:p-5 shadow-sm flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                {c.label}
              </span>
              <Icon className={`w-4 h-4 ${c.iconColor}`} />
            </div>
            <div className="mt-3 flex items-baseline">
              <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                {c.value}
              </span>
              <span className="ml-1 text-xs font-semibold text-slate-400 dark:text-slate-500">
                {c.unit}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};
