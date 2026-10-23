const API_BASE = '/api';

interface RequestOptions extends RequestInit {
  params?: Record<string, any>;
}

export class ApiError extends Error {
  status: number;
  data: any;

  constructor(message: string, status: number, data?: any) {
    super(message);
    this.status = status;
    this.data = data;
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { params, headers, ...restOptions } = options;

  let url = `${API_BASE}${endpoint}`;
  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        searchParams.append(key, String(val));
      }
    });
    const qs = searchParams.toString();
    if (qs) {
      url += (url.includes('?') ? '&' : '?') + qs;
    }
  }

  const token = localStorage.getItem('sms_auth_token');

  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(headers as Record<string, string>),
  };

  const response = await fetch(url, {
    ...restOptions,
    headers: requestHeaders,
  });

  if (response.status === 401) {
    // If unauthorized, clear token and notify
    if (!endpoint.includes('/auth/login')) {
      localStorage.removeItem('sms_auth_token');
      localStorage.removeItem('sms_user');
      window.dispatchEvent(new Event('sms_auth_logout'));
    }
  }

  // Handle CSV/Blob responses
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('text/csv')) {
    const blob = await response.blob();
    return blob as unknown as T;
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new ApiError(
      data?.message || `HTTP error ${response.status}`,
      response.status,
      data
    );
  }

  return data;
}

export const api = {
  get: <T = any>(endpoint: string, params?: Record<string, any>) =>
    apiRequest<T>(endpoint, { method: 'GET', params }),
  post: <T = any>(endpoint: string, body?: any) =>
    apiRequest<T>(endpoint, { method: 'POST', body: JSON.stringify(body) }),
  put: <T = any>(endpoint: string, body?: any) =>
    apiRequest<T>(endpoint, { method: 'PUT', body: JSON.stringify(body) }),
  patch: <T = any>(endpoint: string, body?: any) =>
    apiRequest<T>(endpoint, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T = any>(endpoint: string) =>
    apiRequest<T>(endpoint, { method: 'DELETE' }),
};
