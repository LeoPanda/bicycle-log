import React, { useState } from 'react';
import { Image as ImageIcon, X } from 'lucide-react';
import { api } from '../../services/api';

interface ImageAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  selectedStayId: number | null;
}

export const ImageAddModal: React.FC<ImageAddModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  selectedStayId,
}) => {
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [webUrl, setWebUrl] = useState('');
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);

  if (!isOpen) return null;

  const handleAddImage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStayId) return;
    setUploading(true);
    try {
      const formData = new FormData();
      if (uploadFile) {
        formData.append('file', uploadFile);
      }
      if (webUrl) {
        formData.append('image_url', webUrl);
      }
      if (caption) {
        formData.append('comment', caption);
      }

      await api.uploadImage(selectedStayId, formData);
      setUploadFile(null);
      setWebUrl('');
      setCaption('');
      onSuccess();
      onClose();
    } catch (err: any) {
      alert(`Upload failed: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-6">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-3">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-blue-600" /> 写真の追加
          </h3>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleAddImage} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
              画像ファイルのアップロード (自動 WebP 80% 圧縮)
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
              className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>

          <div className="relative text-center my-2">
            <span className="bg-white dark:bg-slate-800 px-2 text-xs text-slate-400">または</span>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
              外部 Web 画像 URL ダイレクト指定
            </label>
            <input
              type="url"
              placeholder="https://example.com/photo.jpg"
              value={webUrl}
              onChange={(e) => setWebUrl(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
              キャプション / コメント
            </label>
            <input
              type="text"
              placeholder="カフェの限定ラテ"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={uploading || (!uploadFile && !webUrl)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 transition disabled:opacity-50"
            >
              {uploading ? 'アップロード中...' : '追加する'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
