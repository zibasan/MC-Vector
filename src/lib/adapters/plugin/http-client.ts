import { fetch } from '@tauri-apps/plugin-http';

export async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json');
  }
  if (!headers.has('User-Agent')) {
    headers.set('User-Agent', 'MC-Vector/2.0');
  }

  const response = await fetch(url, {
    ...init,
    headers,
  });

  if (!response.ok) {
    throw new Error(`API error ${response.status} ${response.statusText}: ${url}`);
  }
  return response.json() as Promise<T>;
}
