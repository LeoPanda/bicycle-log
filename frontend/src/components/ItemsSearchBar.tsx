import React from 'react';
import { Search, Filter, Activity as ActivityIcon, MapPin } from 'lucide-react';
import { PlaceCategory, Bike } from '../types';

interface ItemsSearchBarProps {
  activeTab: 'activities' | 'places';
  searchInput: string;
  setSearchInput: (val: string) => void;
  handleSearchSubmit: (e: React.FormEvent) => void;
  updateParams: (params: Record<string, string | number | undefined | null>) => void;
  categories: PlaceCategory[];
  categoryId: string;
  bikes: Bike[];
  bikeId: string;
}

export const ItemsSearchBar: React.FC<ItemsSearchBarProps> = ({
  activeTab,
  searchInput,
  setSearchInput,
  handleSearchSubmit,
  updateParams,
  categories,
  categoryId,
  bikes,
  bikeId,
}) => {
  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => updateParams({ tab: 'activities', page: 1, q: '' })}
          className={`flex items-center gap-2 px-6 py-3 font-bold text-sm border-b-2 transition -mb-px ${
            activeTab === 'activities'
              ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <ActivityIcon className="w-4 h-4" />
          アクティビティ一覧
        </button>
        <button
          onClick={() => updateParams({ tab: 'places', page: 1, q: '' })}
          className={`flex items-center gap-2 px-6 py-3 font-bold text-sm border-b-2 transition -mb-px ${
            activeTab === 'places'
              ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <MapPin className="w-4 h-4" />
          滞在スポット一覧
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={activeTab === 'activities' ? "アクティビティ名で検索..." : "スポット名・住所で検索..."}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
          />
        </form>

        <div className="flex items-center gap-3 w-full md:w-auto">
          {activeTab === 'activities' ? (
            <div className="flex items-center gap-2 w-full md:w-auto">
              <Filter className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <select
                value={bikeId}
                onChange={(e) => updateParams({ bike_id: e.target.value, page: 1 })}
                className="w-full md:w-48 px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
              >
                <option value="">すべての自転車</option>
                {bikes.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          ) : (
            <div className="flex items-center gap-2 w-full md:w-auto">
              <Filter className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <select
                value={categoryId}
                onChange={(e) => updateParams({ category_id: e.target.value, page: 1 })}
                className="w-full md:w-48 px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
              >
                <option value="">すべてのカテゴリ</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
