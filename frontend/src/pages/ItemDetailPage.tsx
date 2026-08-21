import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Calendar, ExternalLink, Image as ImageIcon, Plus, Trash2, Clock, Upload, Link as LinkIcon, RefreshCw } from 'lucide-react';
import { api } from '../services/api';

export const ItemDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const itemType = searchParams.get('type') === 'place' ? 'place' : 'activity';

  const [item, setItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Image Modal states
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedStayId, setSelectedStayId] = useState<number | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [webUrl, setWebUrl] = useState('');
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);

  const navigate = useNavigate();

  const fetchItemDetail = async () => {
    setLoading(true);
    try {
      if (itemType === 'activity') {
        const res = await api.get(`/activities/${id}`);
        setItem(res);
      } else {
        const res = await api.get(`/places/${id}`);
        setItem(res);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItemDetail();
  }, [id, itemType]);

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
      setShowImageModal(false);
      setUploadFile(null);
      setWebUrl('');
      setCaption('');
      fetchItemDetail();
    } catch (err: any) {
      alert(`Upload failed: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteImage = async (imageId: number) => {
    if (!confirm('この画像を削除しますか？')) return;
    try {
      await api.delete(`/stay-logs/images/${imageId}`);
      fetchItemDetail();
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!item) {
    return <div className="text-center py-12 text-slate-500">データが見つかりません</div>;
  }

  return (
    <div className="space-y-8">
      {/* Back Header */}
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-blue-600 transition"
      >
        <ArrowLeft className="w-4 h-4" /> 戻る
      </button>

      {/* Main Info Header */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 mb-2">
              {itemType === 'activity' ? 'Strava アクティビティ' : item.category_name || '滞在スポット'}
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
              {item.name}
            </h1>
            {itemType === 'place' && item.address && (
              <p className="text-sm text-slate-500 mt-1 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-rose-500" /> {item.address}
              </p>
            )}
          </div>

          {itemType === 'place' && (
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${item.latitude},${item.longitude}`}
              target="_blank"
              rel="noreferrer"
              title="Google Maps Place"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm rounded-xl transition shadow-sm"
            >
              <ExternalLink className="w-4 h-4" /> Google Mapsで見る
            </a>
          )}
        </div>

        {/* Activity Details Grid */}
        {itemType === 'activity' && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-100 dark:border-slate-700">
            <div>
              <span className="text-xs text-slate-400 font-medium block">走行距離</span>
              <span className="text-xl font-bold text-slate-900 dark:text-white">
                {(item.distance / 1000).toFixed(1)} km
              </span>
            </div>
            <div>
              <span className="text-xs text-slate-400 font-medium block">獲得標高</span>
              <span className="text-xl font-bold text-slate-900 dark:text-white">
                +{item.total_elevation_gain} m
              </span>
            </div>
            <div>
              <span className="text-xs text-slate-400 font-medium block">使用自転車</span>
              <span className="text-xl font-bold text-slate-900 dark:text-white">
                {item.bike_name}
              </span>
            </div>
            <div>
              <span className="text-xs text-slate-400 font-medium block">実施日時</span>
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                {new Date(item.start_date).toLocaleString('ja-JP')}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Interactive Map Section */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4 px-2 flex items-center gap-2">
          <MapPin className="w-5 h-5 text-blue-600" /> 位置情報・ルートマップ
        </h2>
        <div className="w-full h-80 rounded-xl bg-slate-100 dark:bg-slate-900 flex items-center justify-center text-slate-400 text-sm overflow-hidden relative border border-slate-200 dark:border-slate-700">
          <iframe
            title="Google Map Location"
            width="100%"
            height="100%"
            frameBorder="0"
            src={`https://maps.google.com/maps?q=${itemType === 'place' ? item.latitude : 35.3039},${itemType === 'place' ? item.longitude : 139.5015}&z=14&output=embed`}
          />
        </div>
      </div>

      {/* Stay Logs / Gallery Section */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 sm:p-8 shadow-sm">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
          <Clock className="w-5 h-5 text-amber-500" />
          {itemType === 'activity' ? 'このアクティビティ中の滞在記録' : '訪問履歴ログ'}
        </h2>

        {itemType === 'activity' ? (
          <div className="space-y-6">
            {item.stay_logs?.map((stay: any) => (
              <div key={stay.id} className="p-6 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/40 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                      {stay.place_name}
                    </h3>
                    <p className="text-xs text-slate-500 flex items-center gap-2 mt-1">
                      <span>到着: {new Date(stay.arrived_at).toLocaleTimeString('ja-JP')}</span>
                      <span>•</span>
                      <span>滞在時間: {Math.round(stay.stay_duration_seconds / 60)} 分</span>
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      setSelectedStayId(stay.id);
                      setShowImageModal(true);
                    }}
                    title="Select Image"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition"
                  >
                    <Plus className="w-4 h-4" /> 写真の追加
                  </button>
                </div>

                {/* Images gallery */}
                {stay.images && stay.images.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
                    {stay.images.map((img: any) => (
                      <div key={img.id} className="relative group rounded-lg overflow-hidden aspect-square bg-slate-200 dark:bg-slate-800">
                        <img src={img.image_url} alt={img.comment || 'Stay photo'} className="w-full h-full object-cover" />
                        {img.comment && (
                          <div className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[11px] p-1.5 truncate">
                            {img.comment}
                          </div>
                        )}
                        <button
                          onClick={() => handleDeleteImage(img.id)}
                          title="Delete"
                          className="absolute top-2 right-2 p-1 bg-rose-600 text-white rounded opacity-0 group-hover:opacity-100 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {item.stay_logs?.map((stay: any) => (
              <div key={stay.id} className="p-4 rounded-xl border border-slate-100 dark:border-slate-700 flex justify-between items-center">
                <div>
                  <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 block">
                    {new Date(stay.arrived_at).toLocaleString('ja-JP')}
                  </span>
                  <span className="text-xs text-slate-500">
                    滞在時間: {Math.round(stay.stay_duration_seconds / 60)} 分
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Image Modal */}
      {showImageModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-6">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-blue-600" /> 写真の追加
            </h3>

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
                  onClick={() => setShowImageModal(false)}
                  title="Close"
                  className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={uploading || (!uploadFile && !webUrl)}
                  title="Save Changes"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 transition disabled:opacity-50"
                >
                  {uploading ? 'アップロード中...' : '追加する'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
