import React from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCw, Eye, Trash2, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import { api } from '../services/api';
import { useItemsSearch } from '../hooks/useItemsSearch';
import { ItemsSearchBar } from '../components/ItemsSearchBar';

export const ItemsPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    activeTab,
    page,
    sortBy,
    sortOrder,
    searchInput,
    setSearchInput,
    categoryId,
    bikeId,
    activities,
    places,
    categories,
    bikes,
    totalPages,
    loading,
    updateParams,
    handleSearchSubmit,
    handleSort,
  } = useItemsSearch();

  const handleDeleteActivity = async (id: number) => {
    if (!confirm('このアクティビティを削除してもよろしいですか？')) return;
    try {
      await api.delete(`/activities/${id}`);
      window.location.reload();
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  const handleDeletePlace = async (id: string) => {
    if (!confirm('この滞在スポットを削除してもよろしいですか？')) return;
    try {
      await api.delete(`/places/${id}`);
      window.location.reload();
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  const renderSortableHeader = (label: string, colKey: string) => {
    const isActive = sortBy === colKey;
    return (
      <th
        onClick={() => handleSort(colKey)}
        className="px-6 py-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition select-none group"
      >
        <div className="flex items-center gap-1.5">
          <span>{label}</span>
          <span className={`transition ${isActive ? 'text-blue-600 dark:text-blue-400 font-bold' : 'text-slate-400 group-hover:text-slate-600'}`}>
            {isActive ? (
              sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />
            ) : (
              <ArrowUpDown className="w-3.5 h-3.5 opacity-50" />
            )}
          </span>
        </div>
      </th>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">アイテム一覧管理</h2>
        <button
          onClick={() => api.post('/strava/sync').then(() => window.location.reload())}
          title="Sync Strava"
          className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
        >
          <RefreshCw className="w-4 h-4 text-orange-500" />
          Strava同期
        </button>
      </div>

      <ItemsSearchBar
        activeTab={activeTab}
        searchInput={searchInput}
        setSearchInput={setSearchInput}
        handleSearchSubmit={handleSearchSubmit}
        updateParams={updateParams}
        categories={categories}
        categoryId={categoryId}
        bikes={bikes}
        bikeId={bikeId}
      />

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          {activeTab === 'activities' ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
                <thead className="bg-slate-50 dark:bg-slate-900/50 text-xs font-semibold text-slate-500 uppercase border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="px-6 py-4">アクティビティ名</th>
                    <th className="px-6 py-4">使用自転車</th>
                    {renderSortableHeader('走行距離', 'distance')}
                    {renderSortableHeader('獲得標高', 'total_elevation_gain')}
                    {renderSortableHeader('滞在スポット', 'stay_count')}
                    {renderSortableHeader('開始日時', 'start_date')}
                    <th className="px-6 py-4 text-right">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                  {activities.map((act) => (
                    <tr key={act.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-700/30 transition">
                      <td className="px-6 py-4 font-semibold text-slate-900 dark:text-slate-100">{act.name}</td>
                      <td className="px-6 py-4">{act.bike_name}</td>
                      <td className="px-6 py-4 font-mono font-medium">{(act.distance / 1000).toFixed(1)} km</td>
                      <td className="px-6 py-4 font-mono font-medium">+{act.total_elevation_gain} m</td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                          {act.stay_count} 箇所
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-400">
                        {new Date(act.start_date).toLocaleString('ja-JP')}
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        <button
                          onClick={() => navigate(`/items/${act.id}?type=activity`)}
                          title="View Details"
                          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteActivity(act.id)}
                          title="Delete"
                          className="p-1.5 rounded-lg border border-rose-200 dark:border-rose-900/50 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
                <thead className="bg-slate-50 dark:bg-slate-900/50 text-xs font-semibold text-slate-500 uppercase border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="px-6 py-4">スポット名称</th>
                    <th className="px-6 py-4">カテゴリ</th>
                    <th className="px-6 py-4">住所</th>
                    <th className="px-6 py-4">訪問回数</th>
                    <th className="px-6 py-4 text-right">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                  {places.map((place) => (
                    <tr key={place.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-700/30 transition">
                      <td className="px-6 py-4 font-semibold text-slate-900 dark:text-slate-100">{place.name}</td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                          {place.category_name}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500 max-w-xs truncate">{place.address || '-'}</td>
                      <td className="px-6 py-4 font-bold text-blue-600 dark:text-blue-400">{place.visit_count} 回</td>
                      <td className="px-6 py-4 text-right space-x-2">
                        <button
                          onClick={() => navigate(`/items/${place.id}?type=place`)}
                          title="View Details"
                          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeletePlace(place.id)}
                          title="Delete"
                          className="p-1.5 rounded-lg border border-rose-200 dark:border-rose-900/50 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <span className="text-xs text-slate-500">
              Page {page} of {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => updateParams({ page: page - 1 })}
                className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium disabled:opacity-40"
              >
                前へ
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => updateParams({ page: page + 1 })}
                className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium disabled:opacity-40"
              >
                次へ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
