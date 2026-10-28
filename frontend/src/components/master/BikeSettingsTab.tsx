import React, { useState } from 'react';
import { Plus, Pencil, Trash2, X, Check } from 'lucide-react';
import { api } from '../../services/api';
import { Bike } from '../../types';

interface BikeSettingsTabProps {
  bikes: Bike[];
  onRefresh: () => void;
}

export const BikeSettingsTab: React.FC<BikeSettingsTabProps> = ({ bikes, onRefresh }) => {
  const [showModal, setShowModal] = useState(false);
  const [editingBike, setEditingBike] = useState<Bike | null>(null);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const openCreateModal = () => {
    setEditingBike(null);
    setCode('');
    setName('');
    setBrand('');
    setModel('');
    setNotes('');
    setShowModal(true);
  };

  const openEditModal = (bike: Bike) => {
    setEditingBike(bike);
    setCode(bike.bike_code);
    setName(bike.name);
    setBrand(bike.brand || '');
    setModel(bike.model || '');
    setNotes(bike.notes || '');
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingBike) {
        await api.put(`/bikes/${editingBike.id}`, {
          name,
          brand,
          model,
          notes,
        });
      } else {
        await api.post('/bikes', {
          bike_code: code,
          name,
          brand,
          model,
          notes,
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
    if (!confirm('この自転車を削除してもよろしいですか？')) return;
    try {
      await api.delete(`/bikes/${id}`);
      onRefresh();
    } catch (err: any) {
      alert(`削除に失敗しました: ${err.message}`);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">登録済み自転車一覧</h3>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
        >
          <Plus className="w-4 h-4" />
          新規自転車登録
        </button>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
        <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
          <thead className="bg-slate-50 dark:bg-slate-900/50 text-xs font-semibold text-slate-500 uppercase border-b border-slate-200 dark:border-slate-700">
            <tr>
              <th className="px-6 py-4">識別コード</th>
              <th className="px-6 py-4">自転車名称</th>
              <th className="px-6 py-4">ブランド / モデル</th>
              <th className="px-6 py-4">備考</th>
              <th className="px-6 py-4 text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
            {bikes.map((b) => (
              <tr key={b.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-700/30 transition">
                <td className="px-6 py-4 font-mono font-bold text-slate-900 dark:text-white text-xs">{b.bike_code}</td>
                <td className="px-6 py-4 font-semibold text-slate-900 dark:text-white">{b.name}</td>
                <td className="px-6 py-4 text-xs text-slate-500">{b.brand} {b.model}</td>
                <td className="px-6 py-4 text-xs text-slate-400 max-w-xs truncate">{b.notes || '-'}</td>
                <td className="px-6 py-4 text-right space-x-2">
                  <button
                    onClick={() => openEditModal(b)}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(b.id)}
                    className="p-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleSave} className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 border border-slate-200 dark:border-slate-700 shadow-2xl">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-700">
              <h4 className="font-bold text-slate-900 dark:text-white">
                {editingBike ? '自転車情報の編集' : '新規自転車登録'}
              </h4>
              <button type="button" onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {!editingBike && (
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">識別コード *</label>
                <input
                  type="text"
                  required
                  placeholder="例: BIKE-001"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">自転車名 *</label>
              <input
                type="text"
                required
                placeholder="例: Trek Emonda SL6"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">ブランド</label>
                <input
                  type="text"
                  placeholder="例: Trek"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">モデル</label>
                <input
                  type="text"
                  placeholder="例: Emonda"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">備考</label>
              <textarea
                placeholder="仕様やカスタム履歴など"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
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
