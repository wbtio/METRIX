"use client";

import { createClient } from "@/utils/supabase/client";
import { setAccessToken } from "@/lib/api";

let codeExchangeInProgress = false;
let lastExchangedCode: string | null = null;

async function exchangeCode(code: string): Promise<boolean> {
  if (codeExchangeInProgress || lastExchangedCode === code) {
    return false;
  }
  codeExchangeInProgress = true;
  lastExchangedCode = code;

  try {
    const supabase = createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error("[deep-link] exchangeCodeForSession error:", error.message);
      lastExchangedCode = null;
      return false;
    }
    if (data.session?.access_token) {
      setAccessToken(data.session.access_token);
    }
    return true;
  } catch (e) {
    console.error("[deep-link] exchangeCode exception:", e);
    lastExchangedCode = null;
    return false;
  } finally {
    codeExchangeInProgress = false;
  }
}

function extractCode(url: string): string | null {
  try {
    const parsed = new URL(url);
    return parsed.searchParams.get("code");
  } catch {
    return null;
  }
}

/**
 * Check if the app was launched from a deep link (cold start).
 * Returns true if a code was found and exchanged successfully.
 */
export async function checkLaunchUrl(): Promise<boolean> {
  try {
    const { isNativeApp } = await import("@/lib/api");
    if (!isNativeApp()) return false;

    const { App } = await import("@capacitor/app");
    const result = await App.getLaunchUrl();
    if (!result?.url) return false;

    const code = extractCode(result.url);
    if (!code) return false;

    return await exchangeCode(code);
  } catch {
    return false;
  }
}

/**
 * Set up a listener for appUrlOpen events (warm start).
 * Returns a cleanup function.
 */
export async function setupAppUrlOpenListener(
  onSuccess: () => void,
): Promise<() => void> {
  try {
    const { isNativeApp } = await import("@/lib/api");
    if (!isNativeApp()) return () => {};

    const { App } = await import("@capacitor/app");
    const listener = await App.addListener(
      "appUrlOpen",
      async ({ url }: { url: string }) => {
        const code = extractCode(url);
        if (!code) return;
        const success = await exchangeCode(code);
        if (success) onSuccess();
      },
    );
    return () => listener.remove();
  } catch {
    return () => {};
  }
}
