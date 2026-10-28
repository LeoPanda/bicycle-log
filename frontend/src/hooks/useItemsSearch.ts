import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../services/api';
import { Activity, Place, PlaceCategory, Bike } from '../types';

export function useItemsSearch() {
  const [searchParams, setSearchParams] = useSearchParams();

  const activeTab: 'activities' | 'places' = searchParams.get('tab') === 'places' ? 'places' : 'activities';
  const page = parseInt(searchParams.get('page') || '1', 10);
  const sortBy = searchParams.get('sort_by') || 'start_date';
  const sortOrder = searchParams.get('sort_order') || 'desc';
  const search = searchParams.get('q') || '';
  const categoryId = searchParams.get('category_id') || '';
  const bikeId = searchParams.get('bike_id') || '';

  const [searchInput, setSearchInput] = useState(search);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [places, setPlaces] = useState<Place[]>([]);
  const [categories, setCategories] = useState<PlaceCategory[]>([]);
  const [bikes, setBikes] = useState<Bike[]>([]);

  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setSearchInput(search);
  }, [search]);

  useEffect(() => {
    api.get<PlaceCategory[]>('/place-categories').then(setCategories).catch(console.error);
    api.get<Bike[]>('/bikes').then(setBikes).catch(console.error);
  }, []);

  const updateParams = (newParamsObj: Record<string, string | number | undefined | null>) => {
    const newParams = new URLSearchParams(searchParams);
    Object.entries(newParamsObj).forEach(([key, val]) => {
      if (val === undefined || val === null || val === '') {
        newParams.delete(key);
      } else {
        newParams.set(key, String(val));
      }
    });
    setSearchParams(newParams, { replace: true });
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'activities') {
        const query = new URLSearchParams({
          page: String(page),
          per_page: '10',
          sort_by: sortBy,
          sort_order: sortOrder,
          ...(search ? { q: search } : {}),
          ...(bikeId ? { bike_id: bikeId } : {})
        });
        const res: any = await api.get(`/activities?${query.toString()}`);
        setActivities(res.items);
        setTotalPages(res.total_pages);
      } else {
        const query = new URLSearchParams({
          page: String(page),
          per_page: '10',
          ...(search ? { q: search } : {}),
          ...(categoryId ? { category_id: categoryId } : {})
        });
        const res: any = await api.get(`/places?${query.toString()}`);
        setPlaces(res.items);
        setTotalPages(res.total_pages);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab, page, sortBy, sortOrder, search, categoryId, bikeId]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateParams({ q: searchInput, page: 1 });
  };

  const handleSort = (colKey: string) => {
    if (sortBy === colKey) {
      const newOrder = sortOrder === 'asc' ? 'desc' : 'asc';
      updateParams({ sort_by: colKey, sort_order: newOrder, page: 1 });
    } else {
      updateParams({ sort_by: colKey, sort_order: 'desc', page: 1 });
    }
  };

  return {
    activeTab,
    page,
    sortBy,
    sortOrder,
    search,
    searchInput,
    setSearchInput,
    categoryId,
    bikeId,
    activities,
    places,
    categories,
    bikes,
    totalPages,
    loading,
    updateParams,
    handleSearchSubmit,
    handleSort,
  };
}
