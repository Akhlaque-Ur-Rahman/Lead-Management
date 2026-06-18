const TOKEN_KEY = 'lms_auth_token';
const SESSION_KEY = 'lms_user_session';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

type SessionExpiredHandler = () => void;
let onSessionExpired: SessionExpiredHandler | null = null;

export function setSessionExpiredHandler(handler: SessionExpiredHandler) {
  onSessionExpired = handler;
}

function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setAuth(token: string, user: object) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(SESSION_KEY, JSON.stringify(user));
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(SESSION_KEY);
}

export function getStoredUser() {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (res.status === 401) {
    clearAuth();
    onSessionExpired?.();
    throw new Error('Session expired. Please log in again.');
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

export const api = {
  auth: {
    login: (email: string, password: string) =>
      request<{ user: any; token: string }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),
    me: () => request<{ user: any }>('/auth/me'),
    logout: () => request('/auth/logout', { method: 'POST' }),
  },
  users: {
    list: () => request<{ users: any[] }>('/users'),
    create: (data: any) => request<{ user: any }>('/users', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => request<{ user: any }>(`/users/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: string) => request(`/users/${id}`, { method: 'DELETE' }),
    deleteByCompany: (companyId: string) => request(`/users/by-company/${companyId}`, { method: 'DELETE' }),
  },
  companies: {
    list: () => request<{ companies: any[] }>('/companies'),
    get: (id: string) => request<{ company: any }>(`/companies/${id}`),
    create: (data: any) => request<{ company: any }>('/companies', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => request<{ company: any }>(`/companies/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: string) => request(`/companies/${id}`, { method: 'DELETE' }),
    softDelete: (id: string) => request(`/companies/${id}/soft-delete`, { method: 'POST' }),
  },
  leads: {
    list: (view?: string, limit?: number) => {
      const params = new URLSearchParams();
      if (view) params.set('view', view);
      if (limit) params.set('limit', String(limit));
      const qs = params.toString();
      return request<{ leads: any[] }>(`/leads${qs ? `?${qs}` : ''}`);
    },
    create: (data: any) => request<{ lead: any }>('/leads', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => request<{ lead: any }>(`/leads/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    batchCreate: (leads: any[]) => request<{ count: number }>('/leads/batch', { method: 'POST', body: JSON.stringify({ leads }) }),
    assign: (id: string, userId: string) => request(`/leads/${id}/assign`, { method: 'POST', body: JSON.stringify({ userId }) }),
    unassign: (id: string) => request(`/leads/${id}/unassign`, { method: 'POST' }),
    addFollowUp: (id: string, followUp: any, leadUpdates?: any) =>
      request(`/leads/${id}/follow-up`, { method: 'POST', body: JSON.stringify({ followUp, leadUpdates }) }),
    updateFollowUp: (id: string, followUp: any, leadUpdates?: any) =>
      request(`/leads/${id}/follow-up/update`, { method: 'POST', body: JSON.stringify({ followUp, leadUpdates }) }),
    markLost: (id: string, remark: string) =>
      request(`/leads/${id}/mark-lost`, { method: 'POST', body: JSON.stringify({ remark }) }),
    restoreLost: (id: string) => request(`/leads/${id}/restore-lost`, { method: 'POST' }),
    delete: (id: string) => request(`/leads/${id}`, { method: 'DELETE' }),
    markConverted: (id: string, invoiceNo: string, projectValue: string) =>
      request(`/leads/${id}/mark-converted`, { method: 'POST', body: JSON.stringify({ invoiceNo, projectValue }) }),
    checkDuplicates: (field: string, values: string[], companyId?: string) =>
      request<{ duplicates: string[] }>('/leads/check-duplicates', {
        method: 'POST',
        body: JSON.stringify({ field, values, companyId }),
      }),
    checkDuplicatesScoped: (companyId: string, cins: string[]) =>
      request<{ duplicates: string[] }>('/leads/check-duplicates-scoped', {
        method: 'POST',
        body: JSON.stringify({ companyId, cins }),
      }),
  },
  events: {
    latest: (since?: string) => {
      const qs = since ? `?since=${encodeURIComponent(since)}` : '';
      return request<{ event: any | null }>(`/events/latest${qs}`);
    },
    emit: (type: string, payload?: any) =>
      request('/events', { method: 'POST', body: JSON.stringify({ type, payload }) }),
  },
  config: {
    getPublicBranding: () =>
      request<{ systemName: string; logoUrl: string | null }>('/config/branding/public'),
    getBranding: () =>
      request<{ systemName: string; logoUrl: string | null }>('/config/branding'),
    setBranding: (data: { systemName?: string; logoUrl?: string | null }) =>
      request('/config/branding', { method: 'PUT', body: JSON.stringify(data) }),
    getFieldConfig: (companyId: string) =>
      request<{ fieldConfigs: any[] | null }>(`/config/field-config/${companyId}`),
    setFieldConfig: (companyId: string, fieldConfigs: any[]) =>
      request(`/config/field-config/${companyId}`, {
        method: 'PUT',
        body: JSON.stringify({ fieldConfigs }),
      }),
    getPlanPricing: () => request<{ planPricing: any }>('/config/plan-pricing'),
    setPlanPricing: (planPricing: any) =>
      request('/config/plan-pricing', { method: 'PUT', body: JSON.stringify({ planPricing }) }),
  },
};
