import { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import { DashboardSummary, SearchResponse } from '../types';

export type SyncPeriodOption = 'latest' | '1m' | '3m' | '6m' | '1y' | 'before_202509' | 'before_202410' | 'all';

export function useDashboard() {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [detectingRoutes, setDetectingRoutes] = useState(false);
  const [backfillingEndpoints, setBackfillingEndpoints] = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [syncPeriod, setSyncPeriod] = useState<SyncPeriodOption>('latest');
  const [syncResult, setSyncResult] = useState<{
    synced_activities: number;
    detected_stops: number;
    created_places: number;
  } | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResponse | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const res = await api.get<DashboardSummary>('/analytics/dashboard');
      setData(res);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults(null);
      setIsSearching(false);
      setShowDropdown(false);
      return;
    }
    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const res = await api.search(searchQuery.trim());
        setSearchResults(res);
        setShowDropdown(true);
      } catch (err) {
        console.error('Search failed:', err);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleBackfillEndpoints = async () => {
    if (!confirm('すべての過去アクティビティに対して、開始地点およびゴール地点の滞在スポット・ログを一括検出・登録しますか？')) {
      return;
    }
    try {
      setBackfillingEndpoints(true);
      const res = await api.backfillEndpoints(true);
      alert(`スタート・ゴール地点の検出が完了しました。\n処理対象アクティビティ: ${res.processed_activities} 件\n新規登録滞在ログ: ${res.created_endpoint_logs} 件`);
      await fetchDashboard();
    } catch (err: any) {
      alert(`検出に失敗しました: ${err.message}`);
    } finally {
      setBackfillingEndpoints(false);
    }
  };

  const handleExecuteSync = async () => {
    setSyncing(true);
    try {
      let params: { limit_months?: number; all_time?: boolean; before_timestamp?: number } = {};
      if (syncPeriod === '1m') params.limit_months = 1;
      else if (syncPeriod === '3m') params.limit_months = 3;
      else if (syncPeriod === '6m') params.limit_months = 6;
      else if (syncPeriod === '1y') params.limit_months = 12;
      else if (syncPeriod === 'before_202509') params.before_timestamp = 1756684800;
      else if (syncPeriod === 'before_202410') params.before_timestamp = 1727740800;
      else if (syncPeriod === 'all') params.all_time = true;

      const res = await api.syncStrava(params);
      setSyncResult(res);
      await fetchDashboard();
    } catch (err: any) {
      alert(`Strava同期に失敗しました: ${err.message}`);
    } finally {
      setSyncing(false);
    }
  };

  const handleDetectRoutes = async () => {
    try {
      setDetectingRoutes(true);
      const res = await api.detectRoutes();
      alert(`定番ルート自動検出が完了しました。\n検出された定番ルート: ${res.detected_routes} 件\n紐付けられたアクティビティ: ${res.grouped_activities} 件`);
      await fetchDashboard();
    } catch (err: any) {
      alert(`定番ルート検出に失敗しました: ${err.message}`);
    } finally {
      setDetectingRoutes(false);
    }
  };

  return {
    data,
    loading,
    syncing,
    detectingRoutes,
    backfillingEndpoints,
    showSyncModal,
    setShowSyncModal,
    syncPeriod,
    setSyncPeriod,
    syncResult,
    searchQuery,
    setSearchQuery,
    searchResults,
    isSearching,
    showDropdown,
    setShowDropdown,
    searchContainerRef,
    fetchDashboard,
    handleBackfillEndpoints,
    handleExecuteSync,
    handleDetectRoutes,
  };
}
