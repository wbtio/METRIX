"use client";

import { useEffect, useCallback, useRef } from "react";
import { createClient } from "@/utils/supabase/client";
import { isNativeApp, setAccessToken } from "@/lib/api";
import { checkLaunchUrl, setupAppUrlOpenListener } from "@/lib/deep-link-auth";

export function useCapacitorAuth(onAuthSuccess?: () => void) {
  const supabase = createClient();
  const onAuthSuccessRef = useRef(onAuthSuccess);
  onAuthSuccessRef.current = onAuthSuccess;

  const signInWithGoogle = useCallback(async () => {
    if (isNativeApp()) {
      const { Browser } = await import("@capacitor/browser");
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: "https://metrix-beryl-zeta.vercel.app/auth/callback?native=1",
          skipBrowserRedirect: true,
        },
      });
      if (error) {
        console.error("OAuth error:", error.message);
        return;
      }
      if (data?.url) {
        await Browser.open({ url: data.url });
      }
    } else {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) {
        console.error("Error logging in:", error.message);
      }
    }
  }, [supabase]);

  // Set up appUrlOpen listener for warm-start deep links
  useEffect(() => {
    if (!isNativeApp()) return;

    let cleanup: (() => void) | undefined;
    setupAppUrlOpenListener(() => onAuthSuccessRef.current?.()).then((fn) => {
      cleanup = fn;
    });

    return () => cleanup?.();
  }, []);

  // Keep access token in sync with auth state changes
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setAccessToken(session?.access_token ?? null);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  return { signInWithGoogle, checkLaunchUrl };
}
