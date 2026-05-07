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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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

  // Sync notifications from props
  useEffect(() => {
    setVisibleNotifications(notifications);
  }, [notifications]);

  const handleMarkAllRead = useCallback(() => {
    setVisibleNotifications([]);
  }, []);

  return (
    <div className="group relative flex flex-col h-full w-full gap-3 rounded-2xl border border-border/80 bg-white p-3 shadow-sm transition-all hover:border-primary/35 hover:shadow-md dark:bg-card/50 sm:p-4">
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
        <div className="flex-1 min-h-0 overflow-y-auto space-y-2 scrollbar-thin">
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



    </div>
  );
}
