'use client';

import { useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useNotifications } from '@/hooks/useNotifications';

const POLL_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const INITIAL_DELAY_MS = 5 * 1000; // 5 seconds after mount

/**
 * Periodically polls the Telegram cron endpoint to send due reminders.
 * Also triggers an immediate check on mount and after user interactions.
 */
export function useTelegramReminder() {
    const supabase = createClient();
    const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const initialTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const triggerCron = useCallback(async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Fire-and-forget: the cron endpoint handles all users
            await fetch('/api/telegram/reminders/cron', {
                method: 'GET',
                headers: { 'Accept': 'application/json' },
            }).catch(err => {
                // Don't surface cron errors to the user — they're logged server-side
                if (process.env.NODE_ENV === 'development') {
                    console.warn('Telegram cron trigger failed:', err);
                }
            });
        } catch {
            // Swallow — this is a best-effort background task
        }
    }, [supabase]);

    useEffect(() => {
        // Initial check after a short delay (let auth settle)
        initialTimeoutRef.current = setTimeout(() => {
            void triggerCron();
        }, INITIAL_DELAY_MS);

        // Then run periodically
        pollTimerRef.current = setInterval(() => {
            void triggerCron();
        }, POLL_INTERVAL_MS);

        return () => {
            if (initialTimeoutRef.current) {
                clearTimeout(initialTimeoutRef.current);
            }
            if (pollTimerRef.current) {
                clearInterval(pollTimerRef.current);
            }
        };
    }, [triggerCron]);

    return { triggerCron };
}