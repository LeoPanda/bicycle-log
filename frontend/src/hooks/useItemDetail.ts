import { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { api } from '../services/api';

export const useItemDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const itemType: 'activity' | 'place' = searchParams.get('type') === 'place' ? 'place' : 'activity';

  const [item, setItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedStayId, setSelectedStayId] = useState<number | null>(null);

  const [viewingImage, setViewingImage] = useState<any>(null);

  const [showPlaceModal, setShowPlaceModal] = useState(false);
  const [editingStay, setEditingStay] = useState<any>(null);

  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showBikeModal, setShowBikeModal] = useState(false);

  // Map state
  const [showSpots, setShowSpots] = useState(true);
  const [isGrayscale, setIsGrayscale] = useState(false);

  const fetchItemDetail = useCallback(async () => {
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
  }, [id, itemType]);

  useEffect(() => {
    fetchItemDetail();
  }, [fetchItemDetail]);

  const openAddImageModal = (stayId: number) => {
    setSelectedStayId(stayId);
    setShowImageModal(true);
  };

  const openPlaceModal = (stay?: any) => {
    setEditingStay(stay || null);
    setShowPlaceModal(true);
  };

  return {
    id,
    itemType,
    item,
    loading,
    fetchItemDetail,

    // Image Modal
    showImageModal,
    setShowImageModal,
    selectedStayId,
    openAddImageModal,

    // Photo View Modal
    viewingImage,
    setViewingImage,

    // Place Modal
    showPlaceModal,
    setShowPlaceModal,
    editingStay,
    openPlaceModal,

    // Category Modal
    showCategoryModal,
    setShowCategoryModal,

    // Bike Modal
    showBikeModal,
    setShowBikeModal,

    // Map controls
    showSpots,
    setShowSpots,
    isGrayscale,
    setIsGrayscale,
  };
};
