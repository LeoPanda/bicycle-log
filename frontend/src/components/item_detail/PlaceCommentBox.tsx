import React, { useState } from 'react';
import { Pencil, Check, Loader2 } from 'lucide-react';
import { api } from '../../services/api';

interface PlaceCommentBoxProps {
  placeId: number;
  initialComment: string | null;
  onSuccess: () => void;
}

export const PlaceCommentBox: React.FC<PlaceCommentBoxProps> = ({
  placeId,
  initialComment,
  onSuccess,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editingComment, setEditingComment] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put(`/places/${placeId}`, { comment: editingComment.trim() || null });
      setIsEditing(false);
      onSuccess();
    } catch (err: any) {
      alert(`コメントの変更に失敗しました: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/60">
      {isEditing ? (
        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400">コメントの編集</label>
          <textarea
            value={editingComment}
            onChange={(e) => setEditingComment(e.target.value)}
            placeholder="このスポットに関するコメント・メモを入力..."
            rows={3}
            autoFocus
            className="w-full px-3 py-2 border border-blue-500 rounded-xl bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="flex items-center gap-2 justify-end">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-3 py-1.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-300 transition"
            >
              キャンセル
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition disabled:opacity-50 flex items-center gap-1"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              <span>保存</span>
            </button>
          </div>
        </div>
      ) : (
        <div
          onClick={() => {
            setEditingComment(initialComment || '');
            setIsEditing(true);
          }}
          className="group cursor-pointer p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-700/60 hover:border-blue-300 dark:hover:border-blue-600 transition"
          title="クリックしてコメントを編集"
        >
          <div className="flex items-center justify-between text-xs font-bold text-slate-400 dark:text-slate-500 mb-1">
            <span>スポットコメント</span>
            <Pencil className="w-3.5 h-3.5 text-slate-400 opacity-60 group-hover:opacity-100 group-hover:text-blue-600 transition" />
          </div>
          {initialComment ? (
            <p className="text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap">{initialComment}</p>
          ) : (
            <p className="text-xs text-slate-400 italic">コメントなし (クリックして入力)</p>
          )}
        </div>
      )}
    </div>
  );
};
