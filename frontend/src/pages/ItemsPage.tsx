import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, Filter, RefreshCw, Plus, Eye, Pencil, Trash2, MapPin, Activity as ActivityIcon } from 'lucide-react';
import { api } from '../services/api';
import { Activity, Place, PlaceCategory, Bike } from '../types';

export const ItemsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') === 'places' ? 'places' : 'activities';

  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [bikeId, setBikeId] = useState<string>('');
  
  const [activities, setActivities] = useState<Activity[]>([]);
  const [places, setPlaces] = useState<Place[]>([]);
  const [categories, setCategories] = useState<PlaceCategory[]>([]);
  const [bikes, setBikes] = useState<Bike[]>([]);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    // Load categories & bikes for filters
    api.get<PlaceCategory[]>('/place-categories').then(setCategories).catch(console.error);
    api.get<Bike[]>('/bikes').then(setBikes).catch(console.error);
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'activities') {
        const query = new URLSearchParams({
          page: String(page),
          per_page: '10',
          ...(search ? { q: search } : {}),
          ...(bikeId ? { bike_id: bikeId } : {})
        });
        const res: any = await api.get(`/activities?${query.toString()}`);
        setActivities(res.items);
        setTotalPages(res.total_pages);
      } else {
        const query = new URLSearchParams({
          page: String(page),
          per_page: '10',
          ...(search ? { q: search } : {}),
          ...(categoryId ? { category_id: categoryId } : {})
        });
        const res: any = await api.get(`/places?${query.toString()}`);
        setPlaces(res.items);
        setTotalPages(res.total_pages);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab, page, categoryId, bikeId]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchData();
  };

  const handleDeleteActivity = async (id: number) => {
    if (!confirm('このアクティビティを削除してもよろしいですか？')) return;
    try {
      await api.delete(`/activities/${id}`);
      fetchData();
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  const handleDeletePlace = async (id: string) => {
    if (!confirm('この滞在スポットを削除してもよろしいですか？')) return;
    try {
      await api.delete(`/places/${id}`);
      fetchData();
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
          <button
            onClick={() => {
              setSearchParams({ tab: 'activities' });
              setPage(1);
            }}
            className={`flex items-center gap-2 px-5 py-2 rounded-lg font-bold text-sm transition ${
              activeTab === 'activities'
                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <ActivityIcon className="w-4 h-4" />
            アクティビティ一覧
          </button>
          <button
            onClick={() => {
              setSearchParams({ tab: 'places' });
              setPage(1);
            }}
            className={`flex items-center gap-2 px-5 py-2 rounded-lg font-bold text-sm transition ${
              activeTab === 'places'
                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <MapPin className="w-4 h-4" />
            滞在スポット一覧
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => api.post('/strava/sync').then(fetchData)}
            title="Sync Strava"
            className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
          >
            <RefreshCw className="w-4 h-4 text-orange-500" />
            Strava同期
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="名称・住所・キーワードで絞り込み検索..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {activeTab === 'places' && (
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">すべてのカテゴリ</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        )}

        {activeTab === 'activities' && (
          <select
            value={bikeId}
            onChange={(e) => setBikeId(e.target.value)}
            className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">すべての使用自転車</option>
            {bikes.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        )}

        <button
          type="submit"
          title="Search"
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium text-sm transition flex items-center justify-center gap-2"
        >
          <Search className="w-4 h-4" />
          検索
        </button>
      </form>

      {/* Data Table */}
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
                    <th className="px-6 py-4">走行距離</th>
                    <th className="px-6 py-4">獲得標高</th>
                    <th className="px-6 py-4">滞在スポット</th>
                    <th className="px-6 py-4">開始日時</th>
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

          {/* Pagination */}
          <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <span className="text-xs text-slate-500">
              Page {page} of {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium disabled:opacity-40"
              >
                前へ
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
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
