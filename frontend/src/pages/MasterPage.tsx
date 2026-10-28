import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Bike as BikeIcon, MapPin, Tag as TagIcon, Navigation as RouteIcon, RefreshCw, AlertTriangle } from 'lucide-react';
import { api } from '../services/api';
import { Bike, PlaceCategory, Tag, RouteMaster } from '../types';
import { BikeSettingsTab } from '../components/master/BikeSettingsTab';
import { CategorySettingsTab } from '../components/master/CategorySettingsTab';
import { TagSettingsTab } from '../components/master/TagSettingsTab';
import { RouteSettingsTab } from '../components/master/RouteSettingsTab';
import { RouteDetailModal } from '../components/RouteDetailModal';

export const MasterPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<'bikes' | 'categories' | 'tags' | 'routes'>('bikes');

  const [bikes, setBikes] = useState<Bike[]>([]);
  const [categories, setCategories] = useState<PlaceCategory[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [routes, setRoutes] = useState<RouteMaster[]>([]);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const routeIdParam = searchParams.get('route_id');
  const viewRouteId = routeIdParam && !isNaN(parseInt(routeIdParam, 10)) ? parseInt(routeIdParam, 10) : null;

  const openViewModal = (routeId: number) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('tab', 'routes');
    newParams.set('route_id', routeId.toString());
    setSearchParams(newParams);
  };

  const handleCloseViewModal = () => {
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('route_id');
    setSearchParams(newParams, { replace: true });
  };

  const loadData = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      if (activeTab === 'bikes') {
        const res = await api.get<Bike[]>('/bikes');
        setBikes(res);
      } else if (activeTab === 'categories') {
        const res = await api.get<PlaceCategory[]>('/place-categories');
        setCategories(res);
      } else if (activeTab === 'tags') {
        const res = await api.get<Tag[]>('/tags');
        setTags(res);
      } else {
        const res = await api.get<RouteMaster[]>('/routes');
        setRoutes(res);
      }
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'categories' || tabParam === 'tags' || tabParam === 'routes') {
      setActiveTab(tabParam);
    } else {
      setActiveTab('bikes');
    }
  }, [searchParams]);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const handleTabChange = (tab: 'bikes' | 'categories' | 'tags' | 'routes') => {
    setActiveTab(tab);
    const newParams = new URLSearchParams(searchParams);
    newParams.set('tab', tab);
    setSearchParams(newParams);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">マスタデータ管理</h1>
          <p className="text-xs text-slate-500 mt-0.5">自転車・スポットカテゴリ・タグ・定番ルートの保守設定</p>
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-2xl flex items-center gap-3 text-rose-700 dark:text-rose-300 text-xs">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 -mb-px">
        {[
          { id: 'bikes', label: '自転車マスタ', Icon: BikeIcon },
          { id: 'categories', label: 'スポットカテゴリ', Icon: MapPin },
          { id: 'tags', label: 'タグマスタ', Icon: TagIcon },
          { id: 'routes', label: '定番ルート管理', Icon: RouteIcon },
        ].map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => handleTabChange(id as any)}
            className={`flex items-center gap-2 px-6 py-3 font-bold text-sm border-b-2 transition ${
              activeTab === id
                ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : (
        <>
          {activeTab === 'bikes' && <BikeSettingsTab bikes={bikes} onRefresh={loadData} />}
          {activeTab === 'categories' && <CategorySettingsTab categories={categories} onRefresh={loadData} />}
          {activeTab === 'tags' && <TagSettingsTab tags={tags} onRefresh={loadData} />}
          {activeTab === 'routes' && (
            <RouteSettingsTab
              routes={routes}
              onRefresh={loadData}
              onOpenViewModal={openViewModal}
            />
          )}
        </>
      )}

      <RouteDetailModal
        routeId={viewRouteId}
        onClose={handleCloseViewModal}
        onUpdated={loadData}
      />
    </div>
  );
};
