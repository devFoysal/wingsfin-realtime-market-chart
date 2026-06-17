const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "/api";
let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken() {
  return accessToken;
}

export async function request<T>(path: string): Promise<T> {
  const headers: Record<string, string> = {};
  const token = getAccessToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${API_BASE}${path}`, {
    headers
  });
  if (!response.ok) throw new Error(await response.text());
  return response.json() as Promise<T>;
}

export function streamUrl(type: string, symbol: string) {
  return `${API_BASE}/charts/stream?type=${type}&symbol=${encodeURIComponent(symbol)}`;
}
