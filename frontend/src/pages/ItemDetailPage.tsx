import React from 'react';
import { RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useItemDetail } from '../hooks/useItemDetail';
import { ItemDetailHeader } from '../components/item_detail/ItemDetailHeader';
import { ItemDetailMap } from '../components/item_detail/ItemDetailMap';
import { StayLogSection } from '../components/item_detail/StayLogSection';
import { ImageAddModal } from '../components/item_detail/ImageAddModal';
import { PhotoViewModal } from '../components/item_detail/PhotoViewModal';
import { PlaceEditModal } from '../components/item_detail/PlaceEditModal';
import { CategorySelectModal } from '../components/item_detail/CategorySelectModal';
import { BikeSelectModal } from '../components/item_detail/BikeSelectModal';

export const ItemDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    id,
    itemType,
    item,
    loading,
    fetchItemDetail,
    showImageModal,
    setShowImageModal,
    selectedStayId,
    openAddImageModal,
    viewingImage,
    setViewingImage,
    showPlaceModal,
    setShowPlaceModal,
    editingStay,
    openPlaceModal,
    showCategoryModal,
    setShowCategoryModal,
    showBikeModal,
    setShowBikeModal,
    showSpots,
    setShowSpots,
    isGrayscale,
    setIsGrayscale,
  } = useItemDetail();

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
      {/* Main Header & Info */}
      <ItemDetailHeader
        item={item}
        itemType={itemType}
        onRefresh={fetchItemDetail}
        onOpenCategoryModal={() => setShowCategoryModal(true)}
        onOpenBikeModal={() => setShowBikeModal(true)}
        onOpenPlaceModal={() => openPlaceModal()}
      />

      {/* Map Section */}
      <ItemDetailMap
        item={item}
        itemType={itemType}
        showSpots={showSpots}
        setShowSpots={setShowSpots}
        isGrayscale={isGrayscale}
        setIsGrayscale={setIsGrayscale}
      />

      {/* Stay Logs / Gallery */}
      <StayLogSection
        itemType={itemType}
        stayLogs={item.stay_logs}
        onAddImageClick={openAddImageModal}
        onViewImageClick={setViewingImage}
      />

      {/* Modals */}
      <ImageAddModal
        isOpen={showImageModal}
        onClose={() => setShowImageModal(false)}
        onSuccess={fetchItemDetail}
        selectedStayId={selectedStayId}
      />

      <PhotoViewModal
        image={viewingImage}
        onClose={() => setViewingImage(null)}
        onSuccess={fetchItemDetail}
      />

      <PlaceEditModal
        isOpen={showPlaceModal}
        onClose={() => setShowPlaceModal(false)}
        onSuccess={(newPlaceId) => {
          if (newPlaceId && String(newPlaceId) !== id) {
            navigate(`/items/${newPlaceId}?type=place`, { replace: true });
          } else {
            fetchItemDetail();
          }
        }}
        editingStay={editingStay}
        item={item}
        itemType={itemType}
      />

      {itemType === 'place' && (
        <CategorySelectModal
          currentCategoryId={item.category_id || null}
          placeId={item.id}
          isOpen={showCategoryModal}
          onClose={() => setShowCategoryModal(false)}
          onSuccess={fetchItemDetail}
        />
      )}

      {itemType === 'activity' && (
        <BikeSelectModal
          currentBikeId={item.bike_id || null}
          activityId={item.id}
          isOpen={showBikeModal}
          onClose={() => setShowBikeModal(false)}
          onSuccess={fetchItemDetail}
        />
      )}
    </div>
  );
};
