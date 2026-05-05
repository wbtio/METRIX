"use client";

import {
  Clock,
  Edit2,
  Flame,
  Info,
  ListChecks,
  MoreVertical,
  Pin,
  PinOff,
  Trash2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  cn,
  formatNumberEn,
  localeWithEnglishDigits,
  textDirectionFor,
} from "@/lib/utils";
import { getGoalEndDaysChip } from "@/lib/goal-dates";
import { translations, type Language } from "@/lib/translations";
import { getGoalIcon, GoalIconPicker } from "../goal/IconPicker";
import GoalProgressBar from "@/components/shared/GoalProgressBar";

interface Goal {
  id: string;
  title: string;
  current_points: number;
  target_points: number;
  status: string;
  created_at: string;
  estimated_completion_date: string;
  total_days: number;
  ai_summary: string;
  icon?: string;
  is_pinned?: boolean;
}

interface DashboardHeaderProps {
  goal: Goal;
  progress: number;
  streak: number;
  taskCount: number;
  completedTaskCount: number;
  language?: Language;
  showGoalDetails: boolean;
  onToggleDetails: () => void;
  onTogglePin: () => void;
  onEditGoal: () => void;
  onDeleteGoal: () => void;
  onUpdateIcon: (icon: string) => void;
}

export default function DashboardHeader({
  goal,
  progress,
  streak,
  taskCount,
  completedTaskCount,
  language = "en",
  showGoalDetails,
  onToggleDetails,
  onTogglePin,
  onEditGoal,
  onDeleteGoal,
  onUpdateIcon,
}: DashboardHeaderProps) {
  const t = translations[language];
  const isArabic = language === "ar";
  const goalEndDaysChip = getGoalEndDaysChip(
    goal.estimated_completion_date,
    isArabic,
  );
  const titleDir = textDirectionFor(goal.title);
  const dateLocale = localeWithEnglishDigits(language);

  return (
    <div className="rounded-2xl border border-border/80 bg-white dark:bg-card/50 p-2.5 sm:p-4 space-y-2.5 sm:space-y-3">
      <div className="flex items-start justify-between gap-2.5 sm:gap-3">
        <div
          className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0"
          dir={isArabic ? "rtl" : "ltr"}
        >
          <GoalIconPicker
            currentIconName={goal.icon || "Target"}
            onSelect={onUpdateIcon}
          >
            <button className="h-10 w-10 sm:h-12 sm:w-12 p-2.5 shrink-0 bg-primary/10 text-primary hover:bg-primary/20 transition-colors rounded-xl sm:rounded-2xl flex items-center justify-center cursor-pointer border border-primary/15 shadow-sm hover:shadow-md">
              {getGoalIcon(goal.icon)}
            </button>
          </GoalIconPicker>
          <div className="min-w-0 flex-1">
            <h1
              className={cn(
                "text-base sm:text-lg font-black text-foreground line-clamp-2",
                titleDir === "rtl" ? "text-right" : "text-left",
              )}
              dir={titleDir}
            >
              {goal.title}
            </h1>
            <div className="mt-1 flex min-w-0 items-center gap-1 overflow-hidden whitespace-nowrap">
              {goal.is_pinned && (
                <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-amber-600/90 dark:text-amber-400/90">
                  <Pin className="w-3 h-3" /> {isArabic ? "مثبت" : "Pinned"}
                </span>
              )}
              {goalEndDaysChip && (
                <span
                  className={cn(
                    "inline-flex min-w-0 items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-semibold tabular-nums",
                    goalEndDaysChip.tone === "soon" &&
                      "bg-primary/10 text-primary/90 dark:text-primary",
                    goalEndDaysChip.tone === "today" &&
                      "bg-amber-500/10 text-amber-700/90 dark:text-amber-400",
                    goalEndDaysChip.tone === "late" &&
                      "bg-destructive/10 text-destructive/90 dark:text-destructive",
                  )}
                  title={goalEndDaysChip.title}
                >
                  <Clock className="w-3 h-3 shrink-0" aria-hidden />
                  <span className="truncate">{goalEndDaysChip.text}</span>
                </span>
              )}
              {streak > 0 && (
                <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-chart-5/10 px-1.5 py-0.5 text-[9px] font-semibold text-chart-5 dark:bg-chart-3/10 dark:text-chart-3">
                  <Flame className="w-3 h-3" /> {formatNumberEn(streak)}
                </span>
              )}
              {taskCount > 0 && (
                <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-muted/50 px-1.5 py-0.5 text-[9px] font-semibold text-primary tabular-nums">
                  <ListChecks className="w-3 h-3 shrink-0" aria-hidden />
                  <span dir="ltr">
                    {formatNumberEn(completedTaskCount)}/
                    {formatNumberEn(taskCount)}
                  </span>
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <DropdownMenu dir={isArabic ? "rtl" : "ltr"}>
            <DropdownMenuTrigger asChild>
              <button
                className="p-2 sm:p-2.5 rounded-xl hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-all border border-transparent hover:border-border/60"
                title={isArabic ? "خيارات الهدف" : "Goal Options"}
              >
                <MoreVertical className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align={isArabic ? "start" : "end"}
              className={cn("w-52", isArabic && "text-right")}
            >
              <DropdownMenuItem
                onClick={onTogglePin}
                className="cursor-pointer"
              >
                {goal.is_pinned ? (
                  <>
                    <PinOff className="w-4 h-4" />
                    <span>{isArabic ? "إلغاء التثبيت" : "Unpin Goal"}</span>
                  </>
                ) : (
                  <>
                    <Pin className="w-4 h-4" />
                    <span>{isArabic ? "تثبيت الهدف" : "Pin Goal"}</span>
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onEditGoal} className="cursor-pointer">
                <Edit2 className="w-4 h-4" />
                <span>{t.editGoal}</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={onToggleDetails}
                className="cursor-pointer"
              >
                <Info className="w-4 h-4" />
                <span>
                  {showGoalDetails
                    ? isArabic
                      ? "إخفاء التفاصيل"
                      : "Hide Details"
                    : isArabic
                      ? "عرض التفاصيل"
                      : "Show Details"}
                </span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={onDeleteGoal}
                variant="destructive"
                className="cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>{isArabic ? "حذف الهدف" : "Delete Goal"}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Goal Details (collapsible) */}
      {showGoalDetails && (
        <div
          className="pt-2 border-t border-border/60 animate-in fade-in slide-in-from-top-2 duration-200"
          dir={isArabic ? "rtl" : "ltr"}
        >
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <div className="bg-muted/30 rounded-xl p-2.5">
              <p className="text-[10px] text-muted-foreground font-semibold mb-0.5">
                {isArabic ? "تاريخ البدء" : "Start Date"}
              </p>
              <p className="text-xs font-bold text-foreground">
                {new Date(goal.created_at).toLocaleDateString(dateLocale, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            </div>
            <div className="bg-muted/30 rounded-xl p-2.5">
              <p className="text-[10px] text-muted-foreground font-semibold mb-0.5">
                {isArabic ? "تاريخ الانتهاء" : "End Date"}
              </p>
              <p className="text-xs font-bold text-foreground">
                {new Date(goal.estimated_completion_date).toLocaleDateString(
                  dateLocale,
                  { month: "short", day: "numeric", year: "numeric" },
                )}
              </p>
            </div>
            <div className="bg-muted/30 rounded-xl p-2.5">
              <p className="text-[10px] text-muted-foreground font-semibold mb-0.5">
                {isArabic ? "إجمالي الأيام" : "Total Days"}
              </p>
              <p className="text-xs font-bold text-foreground">
                {formatNumberEn(goal.total_days)} {isArabic ? "يوم" : "days"}
              </p>
            </div>
            <div className="bg-muted/30 rounded-xl p-2.5">
              <p className="text-[10px] text-muted-foreground font-semibold mb-0.5">
                {isArabic ? "النقاط الحالية" : "Current Points"}
              </p>
              <p className="text-xs font-bold text-foreground">
                {formatNumberEn(goal.current_points)}
              </p>
            </div>
            <div className="bg-muted/30 rounded-xl p-2.5">
              <p className="text-[10px] text-muted-foreground font-semibold mb-0.5">
                {isArabic ? "النقاط المستهدفة" : "Target Points"}
              </p>
              <p className="text-xs font-bold text-foreground">
                {formatNumberEn(goal.target_points)}
              </p>
            </div>
            <div className="bg-muted/30 rounded-xl p-2.5">
              <p className="text-[10px] text-muted-foreground font-semibold mb-0.5">
                {isArabic ? "الحالة" : "Status"}
              </p>
              <p className="text-xs font-bold text-foreground capitalize">
                {goal.status}
              </p>
            </div>
          </div>
          {goal.ai_summary && (
            <div className="mt-2 bg-primary/5 rounded-xl p-2.5 border border-primary/10">
              <p className="text-[10px] text-primary/70 font-semibold mb-1">
                {t.goalDescription}
              </p>
              <p className="text-xs text-foreground/80 leading-relaxed">
                {goal.ai_summary}
              </p>
            </div>
          )}
        </div>
      )}

      <GoalProgressBar
        currentPoints={goal.current_points}
        targetPoints={goal.target_points}
        progress={progress}
      />
    </div>
  );
}
