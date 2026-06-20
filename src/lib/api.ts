const SERVER_URL = "https://metrix-beryl-zeta.vercel.app";

export function isNativeApp(): boolean {
  if (typeof window === "undefined") return false;
  const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean; isNative?: boolean } }).Capacitor;
  return !!(cap?.isNativePlatform?.() ?? cap?.isNative ?? false);
}

export function apiUrl(path: string): string {
  if (isNativeApp() && path.startsWith("/api/")) {
    return SERVER_URL + path;
  }
  return path;
}

let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAuthHeaders(): Record<string, string> {
  if (accessToken && isNativeApp()) {
    return { Authorization: `Bearer ${accessToken}` };
  }
  return {};
}
