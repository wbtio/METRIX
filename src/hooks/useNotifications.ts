"use client";

import { useState, useEffect, useCallback } from "react";

export type NotificationType =
  | "streak_rescue"
  | "challenge_alert"
  | "daily_focus"
  | "milestone_celebration"
  | "smart_push";

export interface Notification {
  type: NotificationType;
  message: string;
}

export interface UserGoalContext {
  goalId: string;
  goalTitle: string;
  goalIcon: string;
  streakStatus: "safe" | "at_risk" | "broken";
  streakDays: number;
  hasLoggedToday: boolean;
  challengeStatus: "none" | "pending" | "active" | "ended";
  dailyFocusStatus: "none" | "unanswered" | "answered";
  todaysPoints?: number;
}

/* ------------------------------------------------------------------ */
/*  Mock Data                                                         */
/* ------------------------------------------------------------------ */

const MOCK_NOTIFICATIONS_AR: Notification[] = [
  { type: "streak_rescue", message: "سلسلتك انقطعت! سجل نشاطاً الآن قبل فوات الأوان." },
  { type: "challenge_alert", message: "تحدي جديد في انتظارك! هل تجرؤ على قبوله؟" },
  { type: "daily_focus", message: "ما هو تركيزك اليومي؟ خصص 10 دقائق للتخطيط." },
  { type: "milestone_celebration", message: "مبروك! لقد حققت 50% من هدفك." },
  { type: "smart_push", message: "تذكر: كل خطوة صغيرة تقربك من هدفك الكبير." },
];

const MOCK_NOTIFICATIONS_EN: Notification[] = [
  { type: "streak_rescue", message: "Your streak is broken! Log an activity now before it's too late." },
  { type: "challenge_alert", message: "A new challenge awaits! Do you dare to accept it?" },
  { type: "daily_focus", message: "What's your daily focus? Spend 10 minutes planning." },
  { type: "milestone_celebration", message: "Congratulations! You've reached 50% of your goal." },
  { type: "smart_push", message: "Remember: every small step brings you closer to your big goal." },
];

/* ------------------------------------------------------------------ */
/*  Hook                                                              */
/* ------------------------------------------------------------------ */

export function useNotifications(
  context: UserGoalContext,
  language: "ar" | "en" = "en"
) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const generateNotifications = useCallback(() => {
    const isArabic = language === "ar";
    const result: Notification[] = [];

    if (context.goalId) {
      // Streak rescue
      if (context.streakStatus === "at_risk") {
        result.push({
          type: "streak_rescue",
          message: isArabic
            ? `سلسلتك (${context.streakDays} أيام) في خطر! سجل نشاطاً الآن.`
            : `Your streak (${context.streakDays} days) is at risk! Log an activity now.`,
        });
      }

      // Challenge alert
      if (context.challengeStatus === "pending") {
        result.push({
          type: "challenge_alert",
          message: isArabic
            ? "تحديك ما زال ينتظر مشاركين. شارك الرابط!"
            : "Your challenge is still waiting for participants. Share the link!",
        });
      } else if (context.challengeStatus === "active") {
        result.push({
          type: "challenge_alert",
          message: isArabic
            ? "التحدي مستمر! أظهر قوتك ونافس بشراسة."
            : "The challenge is on! Show your strength and compete fiercely.",
        });
      }

      // Daily focus
      if (context.dailyFocusStatus === "unanswered") {
        result.push({
          type: "daily_focus",
          message: isArabic
            ? "لم تجب على سؤال التركيز اليومي بعد. خصص دقيقة للتأمل."
            : "You haven't answered today's focus question yet. Take a minute to reflect.",
        });
      }

      // Smart push
      if (!context.hasLoggedToday && (context.todaysPoints ?? 0) === 0) {
        result.push({
          type: "smart_push",
          message: isArabic
            ? "يومك فاضي؟ سجل نشاطاً صغيراً الآن وابني زخمك."
            : "Your day is empty? Log a small activity now and build momentum.",
        });
      }
    }

    // If no real notifications, show mock data
    if (result.length === 0) {
      return isArabic ? MOCK_NOTIFICATIONS_AR : MOCK_NOTIFICATIONS_EN;
    }

    return result;
  }, [context, language]);

  const refresh = useCallback(() => {
    setLoading(true);
    try {
      const notifs = generateNotifications();
      setNotifications(notifs);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [generateNotifications]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    notifications,
    loading,
    error,
    refresh,
  };
}
