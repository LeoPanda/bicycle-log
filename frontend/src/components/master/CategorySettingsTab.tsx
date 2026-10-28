import React, { useState } from 'react';
import { Plus, Pencil, Trash2, X, Hotel, Coffee, Utensils, Store, Trees, Film, Landmark, Church, Train, ShoppingBag, Camera, Beer, Fuel, Mountain, MapPin } from 'lucide-react';
import { api } from '../../services/api';
import { PlaceCategory } from '../../types';

export const CATEGORY_ICONS = [
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

interface CategorySettingsTabProps {
  categories: PlaceCategory[];
  onRefresh: () => void;
}

export const CategorySettingsTab: React.FC<CategorySettingsTabProps> = ({ categories, onRefresh }) => {
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<PlaceCategory | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('coffee');
  const [sortOrder, setSortOrder] = useState<number>(100);
  const [saving, setSaving] = useState(false);

  const openCreateModal = () => {
    setEditingCategory(null);
    setName('');
    setDescription('');
    setIcon('coffee');
    setSortOrder(100);
    setShowModal(true);
  };

  const openEditModal = (cat: PlaceCategory) => {
    setEditingCategory(cat);
    setName(cat.name);
    setDescription(cat.description || '');
    setIcon(cat.icon || 'coffee');
    setSortOrder(cat.sort_order || 100);
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingCategory) {
        await api.put(`/place-categories/${editingCategory.id}`, {
          name,
          description,
          icon,
          sort_order: sortOrder,
        });
      } else {
        await api.post('/place-categories', {
          name,
          description,
          icon,
          sort_order: sortOrder,
        });
      }
      setShowModal(false);
      onRefresh();
    } catch (err: any) {
      alert(`保存に失敗しました: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('このカテゴリを削除してもよろしいですか？')) return;
    try {
      await api.delete(`/place-categories/${id}`);
      onRefresh();
    } catch (err: any) {
      alert(`削除に失敗しました: ${err.message}`);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">スポットカテゴリ一覧</h3>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
        >
          <Plus className="w-4 h-4" />
          新規カテゴリ登録
        </button>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
        <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
          <thead className="bg-slate-50 dark:bg-slate-900/50 text-xs font-semibold text-slate-500 uppercase border-b border-slate-200 dark:border-slate-700">
            <tr>
              <th className="px-6 py-4">順序</th>
              <th className="px-6 py-4">カテゴリ名</th>
              <th className="px-6 py-4">説明</th>
              <th className="px-6 py-4 text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
            {categories.map((c) => {
              const matchedIcon = CATEGORY_ICONS.find((i) => i.name === c.icon) || CATEGORY_ICONS[14];
              const IconComp = matchedIcon.Icon;
              return (
                <tr key={c.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-700/30 transition">
                  <td className="px-6 py-4 font-mono font-bold text-slate-400 text-xs">{c.sort_order}</td>
                  <td className="px-6 py-4 font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                    <span className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                      <IconComp className="w-4 h-4" />
                    </span>
                    {c.name}
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-500">{c.description || '-'}</td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <button
                      onClick={() => openEditModal(c)}
                      className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(c.id)}
                      className="p-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleSave} className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 border border-slate-200 dark:border-slate-700 shadow-2xl">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-700">
              <h4 className="font-bold text-slate-900 dark:text-white">
                {editingCategory ? 'カテゴリの編集' : '新規カテゴリ登録'}
              </h4>
              <button type="button" onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">カテゴリ名 *</label>
              <input
                type="text"
                required
                placeholder="例: カフェ"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">アイコン</label>
              <select
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm"
              >
                {CATEGORY_ICONS.map((i) => (
                  <option key={i.name} value={i.name}>{i.label} ({i.name})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">表示優先順位 (小さい順)</label>
              <input
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(parseInt(e.target.value, 10) || 100)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">説明</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
              >
                キャンセル
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold disabled:opacity-50"
              >
                {saving ? '保存中...' : '保存'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
