'use client';

import { useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';

const NOTIFICATION_STORAGE_KEY = 'streak_notifications_enabled';
const LAST_NOTIFIED_KEY = 'streak_last_notified_date';
const CHECK_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes

interface Goal {
    id: string;
    title: string;
}

/**
 * Returns whether streak notifications are enabled by the user.
 */
export function isNotificationsEnabled(): boolean {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(NOTIFICATION_STORAGE_KEY) === 'true';
}

/**
 * Sets the notification preference and requests browser permission if enabling.
 * Returns the final granted state.
 */
export async function setNotificationsEnabled(enabled: boolean): Promise<boolean> {
    if (!enabled) {
        localStorage.setItem(NOTIFICATION_STORAGE_KEY, 'false');
        return false;
    }

    // Request browser permission
    if (!('Notification' in window)) {
        return false;
    }

    let permission = Notification.permission;
    if (permission === 'default') {
        permission = await Notification.requestPermission();
    }

    if (permission === 'granted') {
        localStorage.setItem(NOTIFICATION_STORAGE_KEY, 'true');
        return true;
    }

    // Permission denied — don't enable
    localStorage.setItem(NOTIFICATION_STORAGE_KEY, 'false');
    return false;
}

/**
 * Returns the current browser notification permission state.
 */
export function getNotificationPermission(): NotificationPermission | 'unsupported' {
    if (typeof window === 'undefined' || !('Notification' in window)) {
        return 'unsupported';
    }
    return Notification.permission;
}

function toLocalDateStr(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/**
 * Hook that periodically checks for at-risk streaks and sends browser notifications.
 */
export function useStreakReminder(language: 'en' | 'ar' = 'en') {
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const supabase = createClient();

    const checkAndNotify = useCallback(async () => {
        // 1. Guard: notifications must be enabled & browser must grant permission
        if (!isNotificationsEnabled()) return;
        if (typeof window === 'undefined' || !('Notification' in window)) return;
        if (Notification.permission !== 'granted') return;

        // 2. Guard: only notify once per calendar day
        const today = toLocalDateStr(new Date());
        const lastNotified = localStorage.getItem(LAST_NOTIFIED_KEY);
        if (lastNotified === today) return;

        // 3. Get user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // 4. Get all active goals
        const { data: goals, error: goalsError } = await supabase
            .from('goals')
            .select('id, title')
            .eq('user_id', user.id);

        if (goalsError || !goals || goals.length === 0) return;

        // 5. For each goal, check if there's a streak at risk
        //    "At risk" = logged yesterday but NOT today
        const now = new Date();
        const todayStr = toLocalDateStr(now);
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = toLocalDateStr(yesterday);

        // Get today's start & yesterday's start in ISO for range query
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
        const yesterdayStart = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate()).toISOString();

        const atRiskGoals: Goal[] = [];

        for (const goal of goals) {
            // Check if logged today
            const { count: todayCount } = await supabase
                .from('daily_logs')
                .select('id', { count: 'exact', head: true })
                .eq('goal_id', goal.id)
                .gte('created_at', todayStart);

            if ((todayCount ?? 0) > 0) continue; // Already logged today — safe

            // Check if logged yesterday (meaning there IS a streak to protect)
            const { count: yesterdayCount } = await supabase
                .from('daily_logs')
                .select('id', { count: 'exact', head: true })
                .eq('goal_id', goal.id)
                .gte('created_at', yesterdayStart)
                .lt('created_at', todayStart);

            if ((yesterdayCount ?? 0) > 0) {
                atRiskGoals.push(goal);
            }
        }

        // 6. Fire notification if any goals are at risk
        if (atRiskGoals.length > 0) {
            const isArabic = language === 'ar';

            let title: string;
            let body: string;

            if (atRiskGoals.length === 1) {
                title = isArabic ? '🔥 سلسلتك في خطر!' : '🔥 Your streak is at risk!';
                body = isArabic
                    ? `لم تسجّل تقدماً اليوم في "${atRiskGoals[0].title}". سجّل الآن للحفاظ على سلسلتك!`
                    : `You haven't logged progress today for "${atRiskGoals[0].title}". Log now to keep your streak alive!`;
            } else {
                title = isArabic ? '🔥 سلاسلك في خطر!' : '🔥 Your streaks are at risk!';
                body = isArabic
                    ? `لديك ${atRiskGoals.length} أهداف بدون تسجيل اليوم. سجّل الآن!`
                    : `You have ${atRiskGoals.length} goals with no log today. Log now to protect your streaks!`;
            }

            try {
                new Notification(title, {
                    body,
                    icon: '/orbit-icon.svg',
                    tag: 'streak-reminder', // Prevents duplicate notifications
                    requireInteraction: false,
                });
            } catch {
                // Notification constructor can fail in some environments
            }

            localStorage.setItem(LAST_NOTIFIED_KEY, today);
        }
    }, [language, supabase]);

    useEffect(() => {
        // Run the first check shortly after mount (3s delay to let auth settle)
        const initialTimeout = setTimeout(() => {
            checkAndNotify();
        }, 3000);

        // Then run periodically
        intervalRef.current = setInterval(checkAndNotify, CHECK_INTERVAL_MS);

        return () => {
            clearTimeout(initialTimeout);
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [checkAndNotify]);
}
