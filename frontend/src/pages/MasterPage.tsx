import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Pencil, Trash2, AlertTriangle, Check, X, RefreshCw, Tag as TagIcon, MapPin, Bike as BikeIcon, Coffee, Store, Utensils, ShoppingBag, Landmark, Camera, Beer, Fuel, Mountain, Navigation as RouteIcon, Eye, ExternalLink, Hotel, Trees, Film, Church, Train } from 'lucide-react';
import L from 'leaflet';
import { api, ApiError } from '../services/api';
import { Bike, PlaceCategory, Tag, RouteMaster } from '../types';
import { decodePolyline } from '../utils/polyline';
import { RouteDetailModal } from '../components/RouteDetailModal';

const CATEGORY_ICONS = [
  { name: 'hotel', label: '宿泊施設', Icon: Hotel },
  { name: 'coffee', label: 'カフェ', Icon: Coffee },
  { name: 'utensils', label: 'レストラン', Icon: Utensils },
  { name: 'store', label: 'コンビニ', Icon: Store },
  { name: 'trees', label: '公園', Icon: Trees },
  { name: 'film', label: '映画館', Icon: Film },
  { name: 'landmark', label: '博物館・美術館', Icon: Landmark },
  { name: 'church', label: '寺社・仏閣', Icon: Church },
  { name: 'train', label: '駅', Icon: Train },
  { name: 'shopping-bag', label: 'ショップ', Icon: ShoppingBag },
  { name: 'camera', label: '撮影スポット', Icon: Camera },
  { name: 'beer', label: '休憩スポット', Icon: Beer },
  { name: 'fuel', label: '給水・補給', Icon: Fuel },
  { name: 'mountain', label: '山・展望台', Icon: Mountain },
  { name: 'map-pin', label: 'その他', Icon: MapPin },
];

export const MasterPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<'bikes' | 'categories' | 'tags' | 'routes'>('bikes');

  const [bikes, setBikes] = useState<Bike[]>([]);
  const [categories, setCategories] = useState<PlaceCategory[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [routes, setRoutes] = useState<RouteMaster[]>([]);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form Modal States
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  
  // Bike form
  const [bikeCode, setBikeCode] = useState('');
  const [bikeName, setBikeName] = useState('');
  const [bikeBrand, setBikeBrand] = useState('');
  const [bikeModel, setBikeModel] = useState('');
  const [bikeNotes, setBikeNotes] = useState('');

  // Category form
  const [catName, setCatName] = useState('');
  const [catDesc, setCatDesc] = useState('');
  const [catIcon, setCatIcon] = useState('coffee');
  const [catSortOrder, setCatSortOrder] = useState<number>(100);

  // Tag form
  const [tagName, setTagName] = useState('');

  // Route form & Detail Modal
  const [routeName, setRouteName] = useState('');

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

  const navigate = useNavigate();

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
    loadData();
  }, [activeTab]);

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'routes' || routeIdParam) {
      setActiveTab('routes');
    }
  }, [searchParams, routeIdParam]);

  const openCreateModal = () => {
    setEditingItem(null);
    setBikeCode('');
    setBikeName('');
    setBikeBrand('');
    setBikeModel('');
    setBikeNotes('');
    setCatName('');
    setCatDesc('');
    setCatIcon('coffee');
    const nextSortOrder = categories.length > 0
      ? (Math.max(...categories.map(c => c.sort_order ?? 100)) + 10)
      : 10;
    setCatSortOrder(nextSortOrder);
    setTagName('');
    setRouteName('');
    setShowModal(true);
  };

  const openEditModal = (item: any) => {
    setEditingItem(item);
    if (activeTab === 'bikes') {
      setBikeCode(item.bike_code);
      setBikeName(item.name);
      setBikeBrand(item.brand || '');
      setBikeModel(item.model || '');
      setBikeNotes(item.notes || '');
    } else if (activeTab === 'categories') {
      setCatName(item.name);
      setCatDesc(item.description || '');
      setCatIcon(item.icon || 'coffee');
      setCatSortOrder(item.sort_order ?? 100);
    } else if (activeTab === 'routes') {
      setRouteName(item.name);
    }
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (activeTab === 'bikes') {
        if (editingItem) {
          await api.put(`/bikes/${editingItem.id}`, {
            name: bikeName,
            brand: bikeBrand,
            model: bikeModel,
            notes: bikeNotes
          });
        } else {
          await api.post('/bikes', {
            bike_code: bikeCode,
            name: bikeName,
            brand: bikeBrand,
            model: bikeModel,
            notes: bikeNotes
          });
        }
      } else if (activeTab === 'categories') {
        if (editingItem) {
          await api.put(`/place-categories/${editingItem.id}`, {
            name: catName,
            description: catDesc,
            icon: catIcon,
            sort_order: Number(catSortOrder)
          });
        } else {
          await api.post('/place-categories', {
            name: catName,
            description: catDesc,
            icon: catIcon,
            sort_order: Number(catSortOrder)
          });
        }
      } else if (activeTab === 'tags') {
        await api.post('/tags', { name: tagName });
      } else if (activeTab === 'routes') {
        if (editingItem) {
          await api.put(`/routes/${editingItem.id}`, { name: routeName });
        }
      }

      setShowModal(false);
      loadData();
    } catch (err: any) {
      setErrorMessage(err.message);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('このマスタデータを削除してもよろしいですか？')) return;
    setErrorMessage(null);
    try {
      if (activeTab === 'bikes') {
        await api.delete(`/bikes/${id}`);
      } else if (activeTab === 'categories') {
        await api.delete(`/place-categories/${id}`);
      } else if (activeTab === 'tags') {
        await api.delete(`/tags/${id}`);
      } else if (activeTab === 'routes') {
        await api.delete(`/routes/${id}`);
      }
      loadData();
    } catch (err: any) {
      if (err instanceof ApiError && err.status === 409) {
        setErrorMessage(`【削除不可 (HTTP 409 Conflict)】\n${err.message}`);
      } else {
        setErrorMessage(err.message);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-700">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <BikeIcon className="w-6 h-6 text-blue-600" />
            マスタ管理 (SCR-04)
          </h1>
          <p className="text-xs text-slate-500 mt-1">自転車、滞在カテゴリ、タグマスタの管理</p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('bikes')}
              className={`px-4 py-2 rounded-lg font-bold text-xs transition ${
                activeTab === 'bikes'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              自転車マスタ
            </button>
            <button
              onClick={() => setActiveTab('categories')}
              className={`px-4 py-2 rounded-lg font-bold text-xs transition ${
                activeTab === 'categories'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              滞在カテゴリマスタ
            </button>
            <button
              onClick={() => setActiveTab('tags')}
              className={`px-4 py-2 rounded-lg font-bold text-xs transition ${
                activeTab === 'tags'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              タグマスタ
            </button>
            <button
              onClick={() => setActiveTab('routes')}
              className={`px-4 py-2 rounded-lg font-bold text-xs transition ${
                activeTab === 'routes'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              定番ルートマスタ
            </button>
          </div>

          <button
            onClick={openCreateModal}
            title="Add New"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition shadow-sm"
          >
            <Plus className="w-4 h-4" /> 新規登録
          </button>
        </div>
      </div>

      {/* 409 Conflict Error Notification Banner */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-start justify-between gap-3 animate-in fade-in duration-200">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
            <pre className="font-sans whitespace-pre-wrap">{errorMessage}</pre>
          </div>
          <button onClick={() => setErrorMessage(null)} title="Close" className="text-rose-400 hover:text-rose-600 p-1">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Grid & Table Container */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          {/* BIKES TAB */}
          {activeTab === 'bikes' && (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
                  <thead className="bg-slate-50 dark:bg-slate-900/50 text-xs font-semibold text-slate-500 uppercase border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="px-6 py-4">識別コード</th>
                      <th className="px-6 py-4">名称</th>
                      <th className="px-6 py-4">ブランド</th>
                      <th className="px-6 py-4">モデル</th>
                      <th className="px-6 py-4">備考</th>
                      <th className="px-6 py-4 text-right">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                    {bikes.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-8 text-center text-slate-400 text-xs">
                          自転車マスタデータが登録されていません
                        </td>
                      </tr>
                    ) : (
                      bikes.map((b) => (
                        <tr key={b.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition">
                          <td className="px-6 py-4 font-mono font-bold text-slate-900 dark:text-white">{b.bike_code}</td>
                          <td className="px-6 py-4 font-semibold text-slate-900 dark:text-white">{b.name}</td>
                          <td className="px-6 py-4">{b.brand || '-'}</td>
                          <td className="px-6 py-4">{b.model || '-'}</td>
                          <td className="px-6 py-4 text-xs text-slate-500 max-w-xs truncate">{b.notes || '-'}</td>
                          <td className="px-6 py-4 text-right space-x-2">
                            <button
                              onClick={() => openEditModal(b)}
                              title="Edit"
                              className="p-1.5 rounded-lg border border-blue-200 dark:border-blue-900/50 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(b.id)}
                              title="Delete"
                              className="p-1.5 rounded-lg border border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/30 transition"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card Grid View */}
              <div className="md:hidden p-4 space-y-3">
                {bikes.length === 0 ? (
                  <p className="text-center py-6 text-slate-400 text-xs">自転車マスタデータが登録されていません</p>
                ) : (
                  bikes.map((b) => (
                    <div key={b.id} className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/40 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-xs text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-900/30">
                          {b.bike_code}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openEditModal(b)}
                            title="Edit"
                            className="p-1.5 rounded-lg border border-blue-200 text-blue-600 dark:border-blue-900/50 dark:text-blue-400 hover:bg-blue-50"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(b.id)}
                            title="Delete"
                            className="p-1.5 rounded-lg border border-rose-200 text-rose-600 dark:border-rose-900/50 dark:text-rose-400 hover:bg-rose-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <h3 className="font-bold text-slate-900 dark:text-white text-base">{b.name}</h3>
                      <div className="grid grid-cols-2 gap-2 text-xs text-slate-500 pt-1">
                        <div><span className="text-slate-400 block">ブランド</span>{b.brand || '-'}</div>
                        <div><span className="text-slate-400 block">モデル</span>{b.model || '-'}</div>
                      </div>
                      {b.notes && (
                        <p className="text-xs text-slate-400 pt-1 border-t border-slate-200 dark:border-slate-700">{b.notes}</p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </>
          )}

          {/* CATEGORIES TAB */}
          {activeTab === 'categories' && (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
                  <thead className="bg-slate-50 dark:bg-slate-900/50 text-xs font-semibold text-slate-500 uppercase border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="px-6 py-4">優先順位</th>
                      <th className="px-6 py-4">アイコン</th>
                      <th className="px-6 py-4">カテゴリ名</th>
                      <th className="px-6 py-4">説明</th>
                      <th className="px-6 py-4 text-right">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                    {categories.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-8 text-center text-slate-400 text-xs">
                          カテゴリマスタデータが登録されていません
                        </td>
                      </tr>
                    ) : (
                      categories.map((c) => {
                        const iconObj = CATEGORY_ICONS.find((item) => item.name === c.icon) || CATEGORY_ICONS[CATEGORY_ICONS.length - 1];
                        const IconComponent = iconObj.Icon;
                        return (
                          <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition">
                            <td className="px-6 py-4 font-mono font-bold text-blue-600 dark:text-blue-400">
                              {c.sort_order ?? 100}
                            </td>
                            <td className="px-6 py-4">
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 dark:bg-slate-700 rounded-lg font-medium text-xs text-slate-700 dark:text-slate-200">
                                <IconComponent className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                {c.icon || 'map-pin'}
                              </span>
                            </td>
                            <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">{c.name}</td>
                            <td className="px-6 py-4 text-xs text-slate-500">{c.description || '-'}</td>
                            <td className="px-6 py-4 text-right space-x-2">
                              <button
                                onClick={() => openEditModal(c)}
                                title="Edit"
                                className="p-1.5 rounded-lg border border-blue-200 dark:border-blue-900/50 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(c.id)}
                                title="Delete"
                                className="p-1.5 rounded-lg border border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/30 transition"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card Grid View */}
              <div className="md:hidden p-4 space-y-3">
                {categories.length === 0 ? (
                  <p className="text-center py-6 text-slate-400 text-xs">カテゴリマスタデータが登録されていません</p>
                ) : (
                  categories.map((c) => {
                    const iconObj = CATEGORY_ICONS.find((item) => item.name === c.icon) || CATEGORY_ICONS[CATEGORY_ICONS.length - 1];
                    const IconComponent = iconObj.Icon;
                    return (
                      <div key={c.id} className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/40 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
                              優先順位: {c.sort_order ?? 100}
                            </span>
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg text-xs font-semibold">
                              <IconComponent className="w-3.5 h-3.5" />
                              {c.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => openEditModal(c)}
                              title="Edit"
                              className="p-1.5 rounded-lg border border-blue-200 text-blue-600 hover:bg-blue-50"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(c.id)}
                              title="Delete"
                              className="p-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                        {c.description && <p className="text-xs text-slate-500 mt-1">{c.description}</p>}
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}

          {/* ROUTES TAB */}
          {activeTab === 'routes' && (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
                  <thead className="bg-slate-50 dark:bg-slate-900/50 text-xs font-semibold text-slate-500 uppercase border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="px-6 py-4">ID</th>
                      <th className="px-6 py-4">定番ルート名</th>
                      <th className="px-6 py-4">紐付けアクティビティ数</th>
                      <th className="px-6 py-4 text-right">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                    {routes.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-8 text-center text-slate-400 text-xs">
                          定番ルートマスタデータが登録されていません。「定番ルート検出」を実行して自動追加できます。
                        </td>
                      </tr>
                    ) : (
                      routes.map((r) => (
                        <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition">
                          <td className="px-6 py-4 font-mono font-bold text-slate-900 dark:text-white">#{r.id}</td>
                          <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">{r.name}</td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg text-xs font-bold">
                              <RouteIcon className="w-3.5 h-3.5" />
                              {r.activity_count} 件
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right space-x-2">
                            <button
                              onClick={() => openViewModal(r.id)}
                              title="View Details & Map"
                              className="p-1.5 rounded-lg border border-emerald-200 dark:border-emerald-900/50 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(r.id)}
                              title="Delete"
                              className="p-1.5 rounded-lg border border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/30 transition"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card Grid View */}
              <div className="md:hidden p-4 space-y-3">
                {routes.length === 0 ? (
                  <p className="text-center py-6 text-slate-400 text-xs">定番ルートマスタデータが登録されていません</p>
                ) : (
                  routes.map((r) => (
                    <div key={r.id} className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/40 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-xs text-blue-600 dark:text-blue-400">#{r.id}</span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openViewModal(r.id)}
                            title="View Details"
                            className="p-1.5 rounded-lg border border-emerald-200 text-emerald-600 dark:border-emerald-900/50 dark:text-emerald-400 hover:bg-emerald-50"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(r.id)}
                            title="Delete"
                            className="p-1.5 rounded-lg border border-rose-200 text-rose-600 dark:border-rose-900/50 dark:text-rose-400 hover:bg-rose-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <h3 className="font-bold text-slate-900 dark:text-white text-base">{r.name}</h3>
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 text-xs font-bold">
                        <RouteIcon className="w-3.5 h-3.5" /> 配下 {r.activity_count} 件
                      </span>
                    </div>
                  ))
                )}
              </div>
            </>
          )}

          {/* TAGS TAB */}
          {activeTab === 'tags' && (
            <div className="p-6">
              {tags.length === 0 ? (
                <p className="text-center py-8 text-slate-400 text-xs">タグマスタデータが登録されていません</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {tags.map((t) => (
                    <div key={t.id} className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/40 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition">
                      <span className="font-semibold text-slate-900 dark:text-white text-xs flex items-center gap-1.5">
                        <TagIcon className="w-3.5 h-3.5 text-blue-500" />
                        #{t.name}
                      </span>
                      <button
                        onClick={() => handleDelete(t.id)}
                        title="Delete"
                        className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Edit Form Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-6 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {editingItem
                  ? activeTab === 'bikes' ? '自転車マスタの編集' : activeTab === 'categories' ? 'カテゴリマスタの編集' : '定番ルート名の編集'
                  : activeTab === 'bikes' ? '新規自転車の登録' : activeTab === 'categories' ? '新規カテゴリの追加' : '新規タグの追加'}
              </h3>
              <button onClick={() => setShowModal(false)} title="Close" className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              {/* Bike Form Fields */}
              {activeTab === 'bikes' && (
                <>
                  {!editingItem && (
                    <div>
                      <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                        識別コード <span className="text-rose-500">*</span> (例: BIKE-01)
                      </label>
                      <input
                        type="text"
                        required
                        value={bikeCode}
                        onChange={(e) => setBikeCode(e.target.value)}
                        placeholder="BIKE-01"
                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  )}
                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                      自転車名称 <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={bikeName}
                      onChange={(e) => setBikeName(e.target.value)}
                      placeholder="メインロードバイク"
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                        ブランド
                      </label>
                      <input
                        type="text"
                        value={bikeBrand}
                        onChange={(e) => setBikeBrand(e.target.value)}
                        placeholder="Specialized"
                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                        モデル
                      </label>
                      <input
                        type="text"
                        value={bikeModel}
                        onChange={(e) => setBikeModel(e.target.value)}
                        placeholder="Tarmac SL7"
                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                      備考 / メモ
                    </label>
                    <textarea
                      rows={2}
                      value={bikeNotes}
                      onChange={(e) => setBikeNotes(e.target.value)}
                      placeholder="コンポーネント構成やメンテナンス記録など"
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </>
              )}

              {/* Category Form Fields */}
              {activeTab === 'categories' && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                      カテゴリ名 <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={catName}
                      onChange={(e) => setCatName(e.target.value)}
                      placeholder="カフェ・喫茶"
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                      優先順位 (数値、10単位推奨) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      min={1}
                      step={1}
                      value={catSortOrder}
                      onChange={(e) => setCatSortOrder(Number(e.target.value))}
                      placeholder="10, 20, 30..."
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                    />
                    <p className="text-[10px] text-slate-400 mt-0.5">※ 数値が小さいほど自動判定での優先度が高くなります（例: 10 &gt; 20 &gt; 30）。</p>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                      説明
                    </label>
                    <input
                      type="text"
                      value={catDesc}
                      onChange={(e) => setCatDesc(e.target.value)}
                      placeholder="休憩や補給で立ち寄るカフェスポット"
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-2">
                      アイコン選択
                    </label>
                    <div className="grid grid-cols-5 gap-2">
                      {CATEGORY_ICONS.map((item) => {
                        const IconComponent = item.Icon;
                        const isSelected = catIcon === item.name;
                        return (
                          <button
                            key={item.name}
                            type="button"
                            onClick={() => setCatIcon(item.name)}
                            title={item.label}
                            className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1 transition ${
                              isSelected
                                ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 font-bold'
                                : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-600 dark:text-slate-400'
                            }`}
                          >
                            <IconComponent className="w-4 h-4" />
                            <span className="text-[10px] truncate w-full text-center">{item.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}

              {/* Tag Form Fields */}
              {activeTab === 'tags' && (
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                    タグ名 <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">#</span>
                    <input
                      type="text"
                      required
                      value={tagName}
                      onChange={(e) => setTagName(e.target.value)}
                      placeholder="ヒルクライム"
                      className="w-full pl-7 pr-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              )}

              {/* Route Form Fields */}
              {activeTab === 'routes' && (
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                    定番ルート名 <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={routeName}
                    onChange={(e) => setRouteName(e.target.value)}
                    placeholder="荒川サイクリングロード定番コース"
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  title="Close"
                  className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  title="Save Changes"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition shadow-sm flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" /> 保存する
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Route Detail & Map View Modal */}
      <RouteDetailModal
        routeId={viewRouteId}
        onClose={handleCloseViewModal}
        onUpdated={loadData}
      />
    </div>
  );
};
