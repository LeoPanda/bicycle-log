import { http, HttpResponse } from 'msw';

export const handlers = [
  // Health check
  http.get('/api/health', () => {
    return HttpResponse.json({
      status: 'ok',
      project: 'bicycle-log',
      version: '2.1.0',
    });
  }),

  // Bikes
  http.get('/api/bikes', () => {
    return HttpResponse.json([
      {
        id: 1,
        bike_code: 'BIKE-001',
        name: 'Road Bike Alpha',
        brand: 'Trek',
        model: 'Emonda',
        created_at: '2026-08-01T00:00:00',
        updated_at: '2026-08-01T00:00:00',
      },
      {
        id: 2,
        bike_code: 'BIKE-002',
        name: 'Gravel Bike Beta',
        brand: 'Cannondale',
        model: 'Topstone',
        created_at: '2026-08-01T00:00:00',
        updated_at: '2026-08-01T00:00:00',
      },
    ]);
  }),

  // Place Categories
  http.get('/api/place-categories', () => {
    return HttpResponse.json([
      { id: 1, name: 'カフェ', icon: 'coffee', sort_order: 10, description: 'カフェ・喫茶店' },
      { id: 2, name: '公園', icon: 'trees', sort_order: 20, description: '公園・景勝地' },
      { id: 3, name: '道の駅', icon: 'store', sort_order: 30, description: '道の駅・休憩所' },
    ]);
  }),

  // Places
  http.get('/api/places', () => {
    return HttpResponse.json({
      items: [
        {
          id: 'place_mock_01',
          name: '奥多摩湖展望台',
          category_id: 2,
          category_name: '公園',
          category_icon: 'trees',
          address: '東京都西多摩郡奥多摩町原',
          latitude: 35.7905,
          longitude: 139.0512,
          visit_count: 5,
        },
      ],
      total: 1,
      page: 1,
      per_page: 20,
      total_pages: 1,
    });
  }),

  // Activities
  http.get('/api/activities', () => {
    return HttpResponse.json({
      items: [
        {
          id: 1001,
          name: '奥多摩ヒルクライムライド',
          bike_id: 1,
          bike_name: 'Road Bike Alpha',
          start_date: '2026-08-20T08:00:00',
          distance: 45500.0,
          moving_time: 7200,
          elapsed_time: 9000,
          total_elevation_gain: 850.0,
          calories: 1200.0,
          summary_polyline: '',
          stay_count: 2,
        },
      ],
      total: 1,
      page: 1,
      per_page: 20,
      total_pages: 1,
    });
  }),

  // Dashboard Summary
  http.get('/api/analytics/dashboard', () => {
    return HttpResponse.json({
      summary: {
        total_distance_km: 1250.5,
        total_elevation_gain_m: 14500.0,
        total_ride_count: 24,
        total_stay_spots: 18,
      },
      recent_activities: [
        {
          id: 1001,
          name: '奥多摩ヒルクライムライド',
          start_date: '2026-08-20T08:00:00',
          bike_name: 'Road Bike Alpha',
          distance_km: 45.5,
          elevation_gain: 850.0,
        },
      ],
      ranking: [
        {
          place_id: 'place_mock_01',
          place_name: '奥多摩湖展望台',
          category_name: '公園',
          visit_count: 5,
          last_visited_at: '2026-08-20T10:00:00',
        },
      ],
      route_ranking: [],
    });
  }),
];
