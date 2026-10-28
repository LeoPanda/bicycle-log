import React, { useEffect, useState } from 'react';
import { Tag as TagIcon, Loader2, X, Check } from 'lucide-react';
import { api } from '../../services/api';

interface CategorySelectModalProps {
  currentCategoryId: number | null;
  placeId: number;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const CategorySelectModal: React.FC<CategorySelectModalProps> = ({
  currentCategoryId,
  placeId,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [categories, setCategories] = useState<any[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(currentCategoryId);
  const [savingCategory, setSavingCategory] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setSelectedCategoryId(currentCategoryId);
    setLoadingCategories(true);
    api.get<any[]>('/place-categories')
      .then((res) => setCategories(res))
      .catch((err) => console.error('Failed to load categories:', err))
      .finally(() => setLoadingCategories(false));
  }, [isOpen, currentCategoryId]);

  if (!isOpen) return null;

  const handleSaveCategoryChange = async () => {
    if (selectedCategoryId === null) return;
    setSavingCategory(true);
    try {
      await api.put(`/places/${placeId}`, { category_id: selectedCategoryId });
      onSuccess();
      onClose();
    } catch (err: any) {
      alert(`カテゴリの変更に失敗しました: ${err.message}`);
    } finally {
      setSavingCategory(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-3">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <TagIcon className="w-5 h-5 text-blue-600" /> カテゴリの変更
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400">
          この滞在スポットのカテゴリを選択してください。
        </p>

        <div className="flex-1 overflow-y-auto space-y-2 max-h-80 border border-slate-100 dark:border-slate-700/60 p-2 rounded-xl bg-slate-50/50 dark:bg-slate-900/40">
          {loadingCategories ? (
            <div className="flex items-center justify-center py-10 text-slate-400 gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
              <span>カテゴリ一覧を読み込み中...</span>
            </div>
          ) : categories.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-sm">
              カテゴリが登録されていません
            </div>
          ) : (
            categories.map((cat) => {
              const isSelected = selectedCategoryId === cat.id;
              return (
                <div
                  key={cat.id}
                  onClick={() => setSelectedCategoryId(cat.id)}
                  className={`p-3 rounded-xl border cursor-pointer transition flex items-center justify-between gap-3 ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50/80 dark:bg-blue-950/40 ring-1 ring-blue-500'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-blue-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-sm">
                      {cat.name.slice(0, 1)}
                    </span>
                    <div>
                      <div className="font-bold text-sm text-slate-900 dark:text-slate-100">
                        {cat.name}
                      </div>
                      {cat.description && (
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          {cat.description}
                        </div>
                      )}
                    </div>
                  </div>

                  {isSelected && (
                    <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0">
                      <Check className="w-4 h-4" />
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div className="flex justify-end gap-3 pt-2 border-t border-slate-200 dark:border-slate-700">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            キャンセル
          </button>
          <button
            type="button"
            disabled={selectedCategoryId === null || savingCategory}
            onClick={handleSaveCategoryChange}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition disabled:opacity-40 flex items-center gap-2"
          >
            {savingCategory && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {savingCategory ? '保存中...' : '変更を保存'}
          </button>
        </div>
      </div>
    </div>
  );
};
