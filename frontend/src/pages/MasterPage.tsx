import React, { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, AlertTriangle, Check, X, RefreshCw } from 'lucide-react';
import { api, ApiError } from '../services/api';
import { Bike, PlaceCategory, Tag } from '../types';

export const MasterPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'bikes' | 'categories' | 'tags'>('bikes');

  const [bikes, setBikes] = useState<Bike[]>([]);
  const [categories, setCategories] = useState<PlaceCategory[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);

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

  // Category form
  const [catName, setCatName] = useState('');
  const [catDesc, setCatDesc] = useState('');
  const [catIcon, setCatIcon] = useState('coffee');

  // Tag form
  const [tagName, setTagName] = useState('');

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
      } else {
        const res = await api.get<Tag[]>('/tags');
        setTags(res);
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

  const openCreateModal = () => {
    setEditingItem(null);
    setBikeCode('');
    setBikeName('');
    setBikeBrand('');
    setBikeModel('');
    setCatName('');
    setCatDesc('');
    setCatIcon('coffee');
    setTagName('');
    setShowModal(true);
  };

  const openEditModal = (item: any) => {
    setEditingItem(item);
    if (activeTab === 'bikes') {
      setBikeCode(item.bike_code);
      setBikeName(item.name);
      setBikeBrand(item.brand || '');
      setBikeModel(item.model || '');
    } else if (activeTab === 'categories') {
      setCatName(item.name);
      setCatDesc(item.description || '');
      setCatIcon(item.icon || 'coffee');
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
            model: bikeModel
          });
        } else {
          await api.post('/bikes', {
            bike_code: bikeCode,
            name: bikeName,
            brand: bikeBrand,
            model: bikeModel
          });
        }
      } else if (activeTab === 'categories') {
        if (editingItem) {
          await api.put(`/place-categories/${editingItem.id}`, {
            name: catName,
            description: catDesc,
            icon: catIcon
          });
        } else {
          await api.post('/place-categories', {
            name: catName,
            description: catDesc,
            icon: catIcon
          });
        }
      } else {
        await api.post('/tags', { name: tagName });
      }

      setShowModal(false);
      loadData();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
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
      } else {
        await api.delete(`/tags/${id}`);
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
      {/* 409 Conflict Error Notification Banner */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-sm flex items-start justify-between gap-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
            <pre className="font-sans whitespace-pre-wrap">{errorMessage}</pre>
          </div>
          <button onClick={() => setErrorMessage(null)} title="Close" className="text-rose-400 hover:text-rose-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Tabs and Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('bikes')}
            className={`px-5 py-2 rounded-lg font-bold text-sm transition ${
              activeTab === 'bikes'
                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            自転車マスタ
          </button>
          <button
            onClick={() => setActiveTab('categories')}
            className={`px-5 py-2 rounded-lg font-bold text-sm transition ${
              activeTab === 'categories'
                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            滞在カテゴリマスタ
          </button>
          <button
            onClick={() => setActiveTab('tags')}
            className={`px-5 py-2 rounded-lg font-bold text-sm transition ${
              activeTab === 'tags'
                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            タグマスタ
          </button>
        </div>

        <button
          onClick={openCreateModal}
          title="Add New"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition"
        >
          <Plus className="w-4 h-4" /> 新規登録
        </button>
      </div>

      {/* Grid Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          {activeTab === 'bikes' && (
            <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-900/50 text-xs font-semibold text-slate-500 uppercase border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-6 py-4">識別コード</th>
                  <th className="px-6 py-4">名称</th>
                  <th className="px-6 py-4">ブランド</th>
                  <th className="px-6 py-4">モデル</th>
                  <th className="px-6 py-4 text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {bikes.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                    <td className="px-6 py-4 font-mono font-bold text-slate-900 dark:text-white">{b.bike_code}</td>
                    <td className="px-6 py-4 font-semibold">{b.name}</td>
                    <td className="px-6 py-4">{b.brand || '-'}</td>
                    <td className="px-6 py-4">{b.model || '-'}</td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button
                        onClick={() => openEditModal(b)}
                        title="Edit"
                        className="p-1.5 rounded-lg border border-blue-200 dark:border-blue-900/50 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(b.id)}
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
          )}

          {activeTab === 'categories' && (
            <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-900/50 text-xs font-semibold text-slate-500 uppercase border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-6 py-4">カテゴリ名</th>
                  <th className="px-6 py-4">説明</th>
                  <th className="px-6 py-4">アイコン</th>
                  <th className="px-6 py-4 text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {categories.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                    <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">{c.name}</td>
                    <td className="px-6 py-4 text-xs text-slate-500">{c.description || '-'}</td>
                    <td className="px-6 py-4">
                      <span className="font-mono text-xs px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded">
                        {c.icon || 'map-pin'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button
                        onClick={() => openEditModal(c)}
                        title="Edit"
                        className="p-1.5 rounded-lg border border-blue-200 dark:border-blue-900/50 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(c.id)}
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
          )}

          {activeTab === 'tags' && (
            <div className="p-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
              {tags.map((t) => (
                <div key={t.id} className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <span className="font-semibold text-slate-900 dark:text-white text-sm">#{t.name}</span>
                  <button
                    onClick={() => handleDelete(t.id)}
                    title="Delete"
                    className="p-1 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-6">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              {editingItem ? 'マスタの編集' : '新規マスタの追加'}
            </h3>

            <form onSubmit={handleSave} className="space-y-4">
              {activeTab === 'bikes' && (
                <>
                  {!editingItem && (
                    <div>
                      <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
                        識別コード (BIKE-XX)
                      </label>
                      <input
                        type="text"
                        required
                        value={bikeCode}
                        onChange={(e) => setBikeCode(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900"
                      />
                    </div>
                  )}
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
                      自転車名称
                    </label>
                    <input
                      type="text"
                      required
                      value={bikeName}
                      onChange={(e) => setBikeName(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
                      ブランド
                    </label>
                    <input
                      type="text"
                      value={bikeBrand}
                      onChange={(e) => setBikeBrand(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
                      モデル
                    </label>
                    <input
                      type="text"
                      value={bikeModel}
                      onChange={(e) => setBikeModel(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900"
                    />
                  </div>
                </>
              )}

              {activeTab === 'categories' && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
                      カテゴリ名
                    </label>
                    <input
                      type="text"
                      required
                      value={catName}
                      onChange={(e) => setCatName(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
                      説明
                    </label>
                    <input
                      type="text"
                      value={catDesc}
                      onChange={(e) => setCatDesc(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900"
                    />
                  </div>
                </>
              )}

              {activeTab === 'tags' && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
                    タグ名
                  </label>
                  <input
                    type="text"
                    required
                    value={tagName}
                    onChange={(e) => setTagName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900"
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  title="Close"
                  className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  title="Save Changes"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium transition"
                >
                  保存する
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
