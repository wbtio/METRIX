const SUPABASE_BASE = "https://asxynodsnmrymmdspprn.supabase.co/storage/v1/object/public";
const IMAGEKIT_ENDPOINT = "https://ik.imagekit.io/amalcenter";

export function imageUrl(url: string | null | undefined): string {
  if (!url) return "";

  if (url.includes("ik.imagekit.io")) return url;

  if (url.startsWith(SUPABASE_BASE)) {
    const path = url.slice(SUPABASE_BASE.length);
    return `${IMAGEKIT_ENDPOINT}${path}`;
  }

  return url;
}

export function imageUrlOptimized(
  url: string | null | undefined,
  options?: { w?: number; h?: number; q?: number },
): string {
  const base = imageUrl(url);
  if (!base || !base.includes("ik.imagekit.io")) return base;

  const params = [];
  if (options?.w) params.push(`w-${options.w}`);
  if (options?.h) params.push(`h-${options.h}`);
  if (options?.q) params.push(`q-${options.q}`);
  if (params.length === 0) return base;

  return `${base}?tr=${params.join(",")}`;
}

export function isSupabaseStorageUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  return url.includes("supabase.co/storage");
}

export function getStoragePath(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith(SUPABASE_BASE)) {
    return url.slice(SUPABASE_BASE.length);
  }
  return null;
}
