import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';

/**
 * Creates a Supabase server client that accepts EITHER:
 * - A Bearer token from the Authorization header (used by the Capacitor mobile app)
 * - Cookies (used by the deployed web app)
 *
 * This allows challenge API routes to work for both web and mobile.
 */
export async function createRequestClient(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (token) {
    // Mobile app: use the access token directly
    return createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
        cookies: {
          getAll() {
            return [];
          },
          setAll() {},
        },
      }
    );
  }

  // Web app: use cookies (existing behavior)
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // ignored — middleware handles session refresh
          }
        },
      },
    }
  );
}
