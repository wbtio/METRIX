"use client";

import { useEffect, useCallback, useRef } from "react";
import { createClient } from "@/utils/supabase/client";
import { isNativeApp, setAccessToken } from "@/lib/api";

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
          redirectTo: "com.metrix.app://auth",
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

  useEffect(() => {
    if (!isNativeApp()) return;

    let listener: { remove: () => void } | undefined;

    (async () => {
      const { App } = await import("@capacitor/app");
      listener = await App.addListener(
        "appUrlOpen",
        async ({ url }: { url: string }) => {
          try {
            const parsed = new URL(url);
            const code = parsed.searchParams.get("code");
            if (code) {
              const { data, error } =
                await supabase.auth.exchangeCodeForSession(code);
              if (error) {
                console.error("Code exchange error:", error.message);
                return;
              }
              if (data.session?.access_token) {
                setAccessToken(data.session.access_token);
              }
              onAuthSuccessRef.current?.();
            }
          } catch (e) {
            console.error("Deep link parse error:", e);
          }
        },
      );
    })();

    return () => {
      listener?.remove();
    };
  }, [supabase]);

  return { signInWithGoogle };
}
