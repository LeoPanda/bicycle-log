const API_BASE = '/api';

export class ApiError extends Error {
  log_id?: string;
  status?: number;
  constructor(message: string, status?: number, log_id?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.log_id = log_id;
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const response = await fetch(url, { ...options, headers });

  if (response.status === 204) {
    return {} as T;
  }

  let data: any = {};
  try {
    data = await response.json();
  } catch (e) {
    // Empty or non-JSON body
  }

  if (!response.ok) {
    const errorMsg = data?.detail || data?.error?.message || response.statusText || 'An error occurred';
    const logId = data?.log_id || data?.error?.log_id;
    throw new ApiError(errorMsg, response.status, logId);
  }

  return data as T;
}

export const api = {
  get: <T>(endpoint: string) => request<T>(endpoint, { method: 'GET' }),
  post: <T>(endpoint: string, body?: any) => request<T>(endpoint, { method: 'POST', body: JSON.stringify(body) }),
  put: <T>(endpoint: string, body?: any) => request<T>(endpoint, { method: 'PUT', body: JSON.stringify(body) }),
  delete: <T>(endpoint: string) => request<T>(endpoint, { method: 'DELETE' }),
  
  uploadImage: async (stayId: number, formData: FormData) => {
    const response = await fetch(`${API_BASE}/stay-logs/${stayId}/images`, {
      method: 'POST',
      body: formData,
    });
    const data = await response.json();
    if (!response.ok) {
      throw new ApiError(data?.detail || 'Image upload failed', response.status, data?.log_id);
    }
    return data;
  }
};
