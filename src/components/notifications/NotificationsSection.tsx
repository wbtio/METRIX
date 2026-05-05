"use client";

import { useState, useEffect, useCallback } from "react";
import {
  RefreshCw,
  AlertTriangle,
  Swords,
  Brain,
  Trophy,
  Lightbulb,
  CheckCheck,
  Target,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getIconComponent } from "@/components/goal/IconPicker";
import type { NotificationType } from "@/hooks/useNotifications";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export interface NotificationItem {
  type: NotificationType;
  message: string;
}

interface NotificationsSectionProps {
  primaryGoal: {
    id: string;
    title: string;
    icon?: string;
  } | null;
  isArabic: boolean;
  notifications: NotificationItem[];
  notifLoading: boolean;
  notifError: string | null;
  contextReady: boolean;
  onRefresh: () => void;
}

/* ------------------------------------------------------------------ */
/*  Notification Meta (Icons & Colors)                                */
/* ------------------------------------------------------------------ */

const NOTIFICATION_META: Record<
  NotificationType,
  {
    icon: React.ElementType;
    color: string;
    bg: string;
    border: string;
    labelAr: string;
    labelEn: string;
  }
> = {
  streak_rescue: {
    icon: AlertTriangle,
    color: "text-red-600 dark:text-red-400",
    bg: "bg-red-500/10",
    border: "border-red-500/25",
    labelAr: "سلسلة في خطر",
    labelEn: "Streak at risk",
  },
  challenge_alert: {
    icon: Swords,
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/25",
    labelAr: "تحدي",
    labelEn: "Challenge",
  },
  daily_focus: {
    icon: Brain,
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/25",
    labelAr: "تركيز يومي",
    labelEn: "Daily Focus",
  },
  milestone_celebration: {
    icon: Trophy,
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/25",
    labelAr: "إنجاز",
    labelEn: "Milestone",
  },
  smart_push: {
    icon: Lightbulb,
    color: "text-violet-600 dark:text-violet-400",
    bg: "bg-violet-500/10",
    border: "border-violet-500/25",
    labelAr: "دفعة ذكية",
    labelEn: "Smart Push",
  },
};

/* ------------------------------------------------------------------ */
/*  Roast Data                                                        */
/* ------------------------------------------------------------------ */

/** Bumped so updated Iraqi-only lines replace older cached lists. */
const ROASTS_STORAGE_KEY = "metrix_roasts_v2";

/** عراقي محكي فقط — بدون فصحى */
const DEFAULT_ROASTS_AR = [
  "إذا ما تكمل على هدفك راح تنسد، صحصح يا بعد عمري.",
  "الكسل ماكو مجال، قوم اشتغل مو تتمسكن.",
  "كل يوم تؤجل، الهدف يطيح من يدك.",
  "مو كل يوم تخطط وتنسى التنفيذ وبعدين تنام!",
  "هدفك إذا سهل ماكو يصير اسمه هدف أصلاً.",
  "شنو منتظر؟ النجوم تنزل لك من السماء؟",
  "التوفيق يبيه شغل يد، مو بس خواطر.",
  "تريد تطلع فايدة بس ما تريد تتعب؟ استحي على روحك!",
  "وقتك يخلص وانت لسه تتفرج على الريلز.",
  "الناس تشتغل وانت تسوي لايك وشير بس.",
  "إذا تستمر هيج، السنة الجاية نفس القصة.",
  "تحلم بس بدون عمل؟ هاي كذبة تصدقها على نفسك.",
  "تدّي الأفضل، بس تستاهله فعلاً؟",
  "طريق النجاح مو مفروش بوسائد تنوم عليها.",
  "صحصح، حياتك مو نسخة تجريبية تلعب بيها.",
];

const DEFAULT_ROASTS_EN = [
  "If you don't stick to your goal, you'll fail, stupid.",
  "Laziness is not an excuse, wake up and work!",
  "Every day you delay, your goal slips away.",
  "You can't just plan every day and then sleep!",
  "If your goal was easy, it wouldn't be called a goal.",
  "What are you waiting for? A miracle from the sky?",
  "Success needs action, not just dreams.",
  "You want results but don't want the effort? Shame!",
  "Your time is passing while you watch Reels.",
  "The world works while you like and share.",
  "If this continues, next year will be the same.",
  "A dream without work is a lie you tell yourself.",
  "You deserve the best, but do you really deserve it?",
  "The road to success is not paved with pillows.",
  "Wake up! Your life is not a trial version.",
];

/* ------------------------------------------------------------------ */
/*  Sub-components                                                    */
/* ------------------------------------------------------------------ */

function NotificationCard({
  type,
  message,
  isArabic,
  onClick,
}: {
  type: NotificationType;
  message: string;
  isArabic: boolean;
  onClick?: () => void;
}) {
  const meta = NOTIFICATION_META[type];
  const Icon = meta.icon;
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-start gap-3 rounded-2xl border p-3.5 text-start transition-all hover:shadow-sm sm:rounded-3xl sm:p-4",
        meta.bg,
        meta.border,
        "bg-opacity-40"
      )}
    >
      <div
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border bg-background/70 sm:h-10 sm:w-10",
          meta.border
        )}
      >
        <Icon className={cn("h-4 w-4 sm:h-5 sm:w-5", meta.color)} />
      </div>
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            "text-[11px] font-bold uppercase tracking-wide mb-0.5",
            meta.color
          )}
        >
          {isArabic ? meta.labelAr : meta.labelEn}
        </p>
        <p className="text-sm text-foreground leading-relaxed">{message}</p>
      </div>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                    */
/* ------------------------------------------------------------------ */

export default function NotificationsSection({
  primaryGoal,
  isArabic,
  notifications,
  notifLoading,
  notifError,
  contextReady,
  onRefresh,
}: NotificationsSectionProps) {
  const [visibleNotifications, setVisibleNotifications] =
    useState<NotificationItem[]>(notifications);
  const [roasts, setRoasts] = useState<string[]>([]);
  const [currentRoastIndex, setCurrentRoastIndex] = useState(
    () => new Date().getHours() % 15
  );

  // Sync notifications from props
  useEffect(() => {
    setVisibleNotifications(notifications);
  }, [notifications]);

  // Initialize roasts from localStorage
  useEffect(() => {
    const defaultRoasts = isArabic ? DEFAULT_ROASTS_AR : DEFAULT_ROASTS_EN;
    const stored = localStorage.getItem(ROASTS_STORAGE_KEY);

    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length === 15) {
          setRoasts(parsed);
        } else {
          setRoasts(defaultRoasts);
          localStorage.setItem(
            ROASTS_STORAGE_KEY,
            JSON.stringify(defaultRoasts)
          );
        }
      } catch {
        setRoasts(defaultRoasts);
        localStorage.setItem(
          ROASTS_STORAGE_KEY,
          JSON.stringify(defaultRoasts)
        );
      }
    } else {
      setRoasts(defaultRoasts);
      localStorage.setItem(ROASTS_STORAGE_KEY, JSON.stringify(defaultRoasts));
    }
  }, [isArabic]);

  useEffect(() => {
    if (roasts.length > 0) {
      setCurrentRoastIndex((i) => i % roasts.length);
    }
  }, [roasts.length]);

  const handleMarkAllRead = useCallback(() => {
    setVisibleNotifications([]);
  }, []);

  const GoalIcon = primaryGoal
    ? getIconComponent(primaryGoal.icon || "Target")
    : Target;

  const roastCount = roasts.length || 15;
  const safeRoastIndex =
    roastCount > 0 ? ((currentRoastIndex % roastCount) + roastCount) % roastCount : 0;
  const currentRoast =
    roasts[safeRoastIndex] || (isArabic ? "استنى شوي…" : "Loading…");

  const goPrevRoast = useCallback(() => {
    setCurrentRoastIndex((i) => (i - 1 + roastCount) % roastCount);
  }, [roastCount]);

  const goNextRoast = useCallback(() => {
    setCurrentRoastIndex((i) => (i + 1) % roastCount);
  }, [roastCount]);

  return (
    <div className="shrink-0 space-y-3">
      <div className="flex w-full shrink-0 items-center">
        <div className="ms-auto flex items-center gap-1">
          {visibleNotifications.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllRead}
              className="h-7 gap-1 rounded-md px-2 text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">
                {isArabic ? "تحديد الكل كمقروء" : "Mark all as read"}
              </span>
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={onRefresh}
            disabled={notifLoading || !contextReady}
            className="h-7 w-7 rounded-md p-0"
          >
            <RefreshCw
              className={cn("h-3.5 w-3.5", notifLoading && "animate-spin")}
            />
          </Button>
        </div>
      </div>

      {/* Notifications List */}
      {!contextReady || notifLoading ? (
        <div className="space-y-2 animate-pulse">
          <div className="h-14 rounded-2xl bg-muted/60" />
          <div className="h-14 rounded-2xl bg-muted/60" />
        </div>
      ) : (
        <div className="space-y-2 max-h-48 overflow-y-auto scrollbar-thin">
          {visibleNotifications.length === 0 && !notifError && (
            <div className="flex items-center gap-2 rounded-2xl border border-border/40 bg-card/30 p-3 text-muted-foreground">
              <CheckCheck className="h-4 w-4 opacity-50" />
              <p className="text-xs">
                {isArabic
                  ? "لا توجد إشعارات حالياً"
                  : "No notifications right now"}
              </p>
            </div>
          )}
          {visibleNotifications.map((n, idx) => (
            <NotificationCard
              key={`${n.type}-${idx}`}
              type={n.type}
              message={n.message}
              isArabic={isArabic}
              onClick={() => {
                // TODO: Open modal or navigate to relevant tab
                console.log("Notification clicked:", n.type);
              }}
            />
          ))}
          {notifError && (
            <div className="flex items-center gap-2 rounded-2xl bg-red-500/10 border border-red-500/20 p-3 text-red-500 text-xs">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <p>{notifError}</p>
            </div>
          )}
        </div>
      )}

      {/* Iraqi roast strip — manual browse */}
      {primaryGoal && (
        <div
          className="relative overflow-hidden rounded-xl border border-amber-500/20 bg-gradient-to-br from-amber-100/60 via-orange-50/40 to-amber-100/60 py-4 px-4 dark:from-amber-950/30 dark:via-orange-950/20 dark:to-amber-950/30 sm:py-5 sm:px-5"
          dir={isArabic ? "rtl" : "ltr"}
        >
          {/* Top row: icon + counter */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/15 ring-1 ring-amber-500/25 sm:h-9 sm:w-9">
              <GoalIcon className="h-4 w-4 text-amber-600 dark:text-amber-400 sm:h-5 sm:w-5" />
            </div>
            <span className="rounded-md bg-amber-500/10 px-2 py-0.5 font-mono text-xs tabular-nums text-amber-700 dark:text-amber-300">
              {safeRoastIndex + 1}/{roastCount}
            </span>
          </div>

          {/* Message row with nav buttons */}
          <div
            className="flex items-center gap-2 sm:gap-3"
            dir="ltr"
          >
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-10 w-10 shrink-0 rounded-full bg-background/60 text-amber-700 hover:bg-background hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-300"
              onClick={goPrevRoast}
              aria-label={isArabic ? "الرسالة السابقة" : "Previous message"}
            >
              <ChevronLeft className="size-5" />
            </Button>

            <p
              className="min-w-0 flex-1 text-center text-base font-semibold leading-relaxed text-foreground sm:text-lg"
              dir={isArabic ? "rtl" : "ltr"}
            >
              {currentRoast}
            </p>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-10 w-10 shrink-0 rounded-full bg-background/60 text-amber-700 hover:bg-background hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-300"
              onClick={goNextRoast}
              aria-label={isArabic ? "الرسالة التالية" : "Next message"}
            >
              <ChevronRight className="size-5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
