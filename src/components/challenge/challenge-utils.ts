export async function postJSON<T = unknown>(url: string, body: Record<string, unknown>) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(payload?.error || payload?.message || `HTTP ${response.status}`);
  }

  return payload as T;
}

export function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'string' && error.trim()) return error;
  return fallback;
}

export function formatTime(dateIso: string, locale: string) {
  return new Date(dateIso).toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDate(dateIso: string | null, locale: string) {
  if (!dateIso) return '—';
  return new Date(dateIso).toLocaleDateString(locale, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function initialFromName(value: string | null | undefined) {
  const clean = value?.trim();
  if (!clean) return 'U';
  return clean[0]?.toUpperCase() || 'U';
}

export function initialsFromName(value: string | null | undefined) {
  const clean = value?.trim();
  if (!clean) return 'U';

  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return Array.from(parts[0]).slice(0, 2).join('').toUpperCase();
  }

  return parts
    .slice(0, 2)
    .map((part) => Array.from(part)[0] || '')
    .join('')
    .toUpperCase();
}

function hashString(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = value.charCodeAt(index) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
}

export function buildFallbackAvatar(displayName: string) {
  const palette = [
    ['#0f766e', '#34d399'],
    ['#1d4ed8', '#60a5fa'],
    ['#7c3aed', '#a78bfa'],
    ['#be185d', '#f472b6'],
    ['#c2410c', '#fb923c'],
    ['#475569', '#94a3b8'],
  ];
  const safeName = displayName?.trim() || 'User';
  const [startColor, endColor] = palette[hashString(safeName) % palette.length];
  const initials = initialsFromName(safeName);
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96" fill="none">
      <defs>
        <linearGradient id="g" x1="8" y1="8" x2="88" y2="88" gradientUnits="userSpaceOnUse">
          <stop stop-color="${startColor}" />
          <stop offset="1" stop-color="${endColor}" />
        </linearGradient>
      </defs>
      <rect width="96" height="96" rx="24" fill="url(#g)" />
      <circle cx="74" cy="22" r="10" fill="white" fill-opacity="0.16" />
      <circle cx="24" cy="78" r="14" fill="white" fill-opacity="0.12" />
      <text
        x="48"
        y="55"
        text-anchor="middle"
        font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
        font-size="30"
        font-weight="800"
        fill="white"
      >
        ${initials}
      </text>
    </svg>
  `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}
