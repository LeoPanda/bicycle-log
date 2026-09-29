import React from 'react';
import {
  Hotel, Coffee, Utensils, Store, Trees, Film, Landmark, Church, Train,
  ShoppingBag, Camera, Beer, Fuel, Mountain, MapPin
} from 'lucide-react';

export const CATEGORY_ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  hotel: Hotel,
  coffee: Coffee,
  utensils: Utensils,
  store: Store,
  trees: Trees,
  film: Film,
  landmark: Landmark,
  church: Church,
  train: Train,
  'shopping-bag': ShoppingBag,
  camera: Camera,
  beer: Beer,
  fuel: Fuel,
  mountain: Mountain,
  'map-pin': MapPin,
};

export const getCategoryIconComponent = (iconName?: string): React.ComponentType<{ className?: string }> => {
  if (!iconName) return MapPin;
  return CATEGORY_ICON_MAP[iconName.toLowerCase()] || MapPin;
};
