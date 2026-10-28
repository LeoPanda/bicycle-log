import React, { useState } from 'react';
import { Navigation as RouteIcon, Eye, Trash2, RefreshCw } from 'lucide-react';
import { api } from '../../services/api';
import { RouteMaster } from '../../types';

interface RouteSettingsTabProps {
  routes: RouteMaster[];
  onRefresh: () => void;
  onOpenViewModal: (routeId: number) => void;
}

export const RouteSettingsTab: React.FC<RouteSettingsTabProps> = ({
  routes,
  onRefresh,
  onOpenViewModal,
}) => {
  const [detecting, setDetecting] = useState(false);

  const handleDetect = async () => {
    setDetecting(true);
    try {
      const res = await api.detectRoutes();
      alert(`定番ルート自動検出が完了しました。\n検出された定番ルート: ${res.detected_routes} 件\n紐付けられたアクティビティ: ${res.grouped_activities} 件`);
      onRefresh();
    } catch (err: any) {
      alert(`定番ルート検出に失敗しました: ${err.message}`);
    } finally {
      setDetecting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('この定番ルートを削除してもよろしいですか？紐付いているアクティビティの連携は解除されます。')) return;
    try {
      await api.delete(`/routes/${id}`);
      onRefresh();
    } catch (err: any) {
      alert(`削除に失敗しました: ${err.message}`);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">定番ルート一覧</h3>
        <button
          onClick={handleDetect}
          disabled={detecting}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-sm disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${detecting ? 'animate-spin' : ''}`} />
          定番ルート自動検出・再グループ化
        </button>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
        <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
          <thead className="bg-slate-50 dark:bg-slate-900/50 text-xs font-semibold text-slate-500 uppercase border-b border-slate-200 dark:border-slate-700">
            <tr>
              <th className="px-6 py-4">ID</th>
              <th className="px-6 py-4">定番ルート名</th>
              <th className="px-6 py-4">紐付きライド数</th>
              <th className="px-6 py-4 text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
            {routes.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-700/30 transition">
                <td className="px-6 py-4 font-mono font-bold text-slate-400 text-xs">#{r.id}</td>
                <td className="px-6 py-4 font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <RouteIcon className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  {r.name}
                </td>
                <td className="px-6 py-4 font-bold text-blue-600 dark:text-blue-400">
                  {r.activity_count || 0} ライド
                </td>
                <td className="px-6 py-4 text-right space-x-2">
                  <button
                    onClick={() => onOpenViewModal(r.id)}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
                    title="詳細・編集"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(r.id)}
                    className="p-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30"
                    title="削除"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {routes.length === 0 && (
          <p className="text-center py-8 text-slate-400 text-xs">定番ルートはありません。「自動検出」を実行してください。</p>
        )}
      </div>
    </div>
  );
};
