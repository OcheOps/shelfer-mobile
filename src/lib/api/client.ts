import { getSession, saveSession } from '../storage/session';
import type { ApiSuccess, ApiError } from '../../types/api';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.20:8080';

class ApiClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = BASE_URL;
  }

  private async getToken(): Promise<string | null> {
    const session = await getSession();
    return session?.accessToken ?? null;
  }

  private async request<T>(method: string, path: string, body?: unknown, retry = true): Promise<T> {
    const token = await this.getToken();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${this.baseUrl}/api/v1${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    // Token refresh on 401
    if (res.status === 401 && retry) {
      const refreshed = await this.tryRefresh();
      if (refreshed) return this.request<T>(method, path, body, false);
    }

    const json = await res.json();

    if (!res.ok) {
      const err = json as ApiError;
      throw new Error(err.error?.message || `Request failed (${res.status})`);
    }

    return json as T;
  }

  private async tryRefresh(): Promise<boolean> {
    const session = await getSession();
    if (!session?.refreshToken) return false;

    try {
      const res = await fetch(`${this.baseUrl}/api/v1/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: session.refreshToken }),
      });

      if (!res.ok) return false;

      const json = await res.json();
      const { access_token, refresh_token } = json.data;
      session.accessToken = access_token;
      session.refreshToken = refresh_token;
      await saveSession(session);
      return true;
    } catch {
      return false;
    }
  }

  async login(email: string, password: string) {
    const res = await fetch(`${this.baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error?.message || 'Login failed');
    return json as ApiSuccess<{ access_token: string; refresh_token: string }>;
  }

  get<T>(path: string) { return this.request<T>('GET', path); }
  post<T>(path: string, body?: unknown) { return this.request<T>('POST', path, body); }
}

export const api = new ApiClient();
