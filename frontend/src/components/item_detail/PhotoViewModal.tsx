import React, { useState } from 'react';
import { Image as ImageIcon, X, Pencil, Check, Loader2, Trash2 } from 'lucide-react';
import { api } from '../../services/api';

interface PhotoViewModalProps {
  image: any;
  onClose: () => void;
  onSuccess: () => void;
}

export const PhotoViewModal: React.FC<PhotoViewModalProps> = ({
  image,
  onClose,
  onSuccess,
}) => {
  const [isEditingPhotoComment, setIsEditingPhotoComment] = useState(false);
  const [editingPhotoComment, setEditingPhotoComment] = useState('');
  const [savingPhotoComment, setSavingPhotoComment] = useState(false);
  const [currentImage, setCurrentImage] = useState(image);

  if (!currentImage) return null;

  const handleSavePhotoComment = async () => {
    setSavingPhotoComment(true);
    try {
      const updatedImg = await api.updateImageComment(currentImage.id, editingPhotoComment.trim());
      setCurrentImage({ ...currentImage, comment: updatedImg.comment });
      setIsEditingPhotoComment(false);
      onSuccess();
    } catch (err: any) {
      alert(`コメントの変更に失敗しました: ${err.message}`);
    } finally {
      setSavingPhotoComment(false);
    }
  };

  const handleDeleteImage = async (imageId: number) => {
    if (!confirm('この画像を削除しますか？')) return;
    try {
      await api.delete(`/stay-logs/images/${imageId}`);
      onSuccess();
      onClose();
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={() => {
        onClose();
        setIsEditingPhotoComment(false);
      }}
    >
      <div
        className="bg-white dark:bg-slate-800 rounded-2xl max-w-2xl w-full p-5 shadow-2xl space-y-4 max-h-[90vh] flex flex-col relative"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-3">
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-blue-600" /> 写真の詳細
          </h3>
          <button
            onClick={() => {
              onClose();
              setIsEditingPhotoComment(false);
            }}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 flex items-center justify-center overflow-hidden bg-slate-900/90 rounded-xl p-2 min-h-[250px] max-h-[60vh]">
          <img
            src={currentImage.image_url}
            alt={currentImage.comment || '拡大写真'}
            className="max-w-full max-h-[58vh] object-contain rounded-md"
          />
        </div>

        {isEditingPhotoComment ? (
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400">コメントの編集</label>
            <input
              type="text"
              value={editingPhotoComment}
              onChange={(e) => setEditingPhotoComment(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSavePhotoComment();
                if (e.key === 'Escape') setIsEditingPhotoComment(false);
              }}
              autoFocus
              placeholder="写真のキャプション/コメントを入力..."
              className="w-full px-3 py-2 border border-blue-500 rounded-xl text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsEditingPhotoComment(false)}
                className="px-3 py-1 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold hover:bg-slate-300 transition"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={handleSavePhotoComment}
                disabled={savingPhotoComment}
                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition disabled:opacity-50 flex items-center gap-1"
              >
                {savingPhotoComment ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                <span>保存</span>
              </button>
            </div>
          </div>
        ) : (
          <div
            onClick={() => {
              setEditingPhotoComment(currentImage.comment || '');
              setIsEditingPhotoComment(true);
            }}
            className="group cursor-pointer p-3 rounded-xl bg-slate-100 dark:bg-slate-900/60 text-sm border border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-600 transition"
            title="クリックしてコメントを編集"
          >
            <div className="flex items-center justify-between text-xs font-semibold text-slate-400 dark:text-slate-500 mb-1">
              <span>コメント</span>
              <Pencil className="w-3.5 h-3.5 text-slate-400 opacity-60 group-hover:opacity-100 group-hover:text-blue-600 transition" />
            </div>
            {currentImage.comment ? (
              <p className="text-slate-800 dark:text-slate-200">{currentImage.comment}</p>
            ) : (
              <p className="text-xs text-slate-400 italic">コメントなし (クリックして入力)</p>
            )}
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-700">
          <button
            type="button"
            onClick={() => handleDeleteImage(currentImage.id)}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-xl transition shadow-sm cursor-pointer"
          >
            <Trash2 className="w-4 h-4" /> この写真を削除
          </button>

          <button
            type="button"
            onClick={() => {
              onClose();
              setIsEditingPhotoComment(false);
            }}
            className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
};
