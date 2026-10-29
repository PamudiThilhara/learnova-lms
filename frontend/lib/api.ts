import type { User } from '@/data/users';
import type { DemoData } from './learnova-state';

export const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api').replace(/\/$/, '');
export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export async function api<T = Record<string, never>>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set('X-Learnova-Request', '1');
  if (options.body && !(options.body instanceof FormData)) headers.set('Content-Type', 'application/json');
  let response: Response;
  try { response = await fetch(`${API_URL}${path}`, { ...options, headers, credentials: 'include', cache: 'no-store' }); }
  catch { throw new ApiError(0, 'Cannot connect to Learnova. Check that the backend is running and try again.'); }
  if (response.status === 204) return {} as T;
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new ApiError(response.status, data.errors?.map((e: { message: string }) => e.message).join(' ') || data.message || 'The request could not be completed.');
  return data as T;
}
export const apiState = () => api<DemoData & { activeId: string | null }>('/state');
export const apiLogin = (email: string, password: string, remember: boolean) => api<{ user: User }>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password, remember }) });
export const errorMessage = (error: unknown) => error instanceof Error ? error.message : 'The request could not be completed.';
