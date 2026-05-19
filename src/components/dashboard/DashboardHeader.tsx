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
    <div className="rounded-2xl border border-border/60 bg-card p-3 sm:p-4 space-y-3 shadow-sm shadow-black/[0.02] dark:bg-card/60">
      <div className="flex items-start justify-between gap-2.5 sm:gap-3">
        <div
          className="flex items-center gap-2.5 sm:gap-3 flex-1 min-w-0"
          dir={isArabic ? "rtl" : "ltr"}
        >
          <GoalIconPicker
            currentIconName={goal.icon || "Target"}
            onSelect={onUpdateIcon}
          >
            <button className="h-10 w-10 sm:h-11 sm:w-11 p-2 shrink-0 bg-primary/[0.08] text-primary hover:bg-primary/[0.12] transition-colors duration-200 rounded-[10px] flex items-center justify-center cursor-pointer border border-primary/10">
              {getGoalIcon(goal.icon)}
            </button>
          </GoalIconPicker>
          <div className="min-w-0 flex-1">
            <h1
              className={cn(
                "text-[15px] sm:text-base font-bold text-foreground line-clamp-2 tracking-tight leading-snug",
                titleDir === "rtl" ? "text-right" : "text-left",
              )}
              dir={titleDir}
            >
              {goal.title}
            </h1>
            <div className="mt-1.5 flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1">
              {goal.is_pinned && (
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-500/[0.08] px-2 py-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400 border border-amber-500/10">
                  <Pin className="w-2.5 h-2.5" /> {isArabic ? "مثبت" : "Pinned"}
                </span>
              )}
              {goalEndDaysChip && (
                <span
                  className={cn(
                    "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold tabular-nums border",
                    goalEndDaysChip.tone === "soon" &&
                      "bg-primary/[0.06] text-primary border-primary/10",
                    goalEndDaysChip.tone === "today" &&
                      "bg-amber-500/[0.06] text-amber-700 dark:text-amber-400 border-amber-500/10",
                    goalEndDaysChip.tone === "late" &&
                      "bg-destructive/[0.06] text-destructive border-destructive/10",
                  )}
                  title={goalEndDaysChip.title}
                >
                  <Clock className="w-2.5 h-2.5 shrink-0" aria-hidden />
                  <span className="truncate">{goalEndDaysChip.text}</span>
                </span>
              )}
              {streak > 0 && (
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-chart-5/[0.06] px-2 py-0.5 text-[10px] font-semibold text-chart-5 dark:text-chart-3 border border-chart-5/10">
                  <Flame className="w-2.5 h-2.5" /> {formatNumberEn(streak)}
                </span>
              )}
              {taskCount > 0 && (
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-muted/40 px-2 py-0.5 text-[10px] font-semibold text-primary tabular-nums border border-border/30">
                  <ListChecks className="w-2.5 h-2.5 shrink-0" aria-hidden />
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
                className="p-2 rounded-lg hover:bg-muted/50 text-muted-foreground/70 hover:text-foreground transition-all border border-transparent hover:border-border/40"
                title={isArabic ? "خيارات الهدف" : "Goal Options"}
              >
                <MoreVertical className="w-4 h-4" />
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
          className="pt-3 border-t border-border/30 animate-in fade-in slide-in-from-top-2 duration-200"
          dir={isArabic ? "rtl" : "ltr"}
        >
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <div className="bg-muted/20 rounded-xl p-2.5 border border-border/30">
              <p className="text-[10px] text-muted-foreground/80 font-semibold mb-1">
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
            <div className="bg-muted/20 rounded-xl p-2.5 border border-border/30">
              <p className="text-[10px] text-muted-foreground/80 font-semibold mb-1">
                {isArabic ? "تاريخ الانتهاء" : "End Date"}
              </p>
              <p className="text-xs font-bold text-foreground">
                {new Date(goal.estimated_completion_date).toLocaleDateString(
                  dateLocale,
                  { month: "short", day: "numeric", year: "numeric" },
                )}
              </p>
            </div>
            <div className="bg-muted/20 rounded-xl p-2.5 border border-border/30">
              <p className="text-[10px] text-muted-foreground/80 font-semibold mb-1">
                {isArabic ? "إجمالي الأيام" : "Total Days"}
              </p>
              <p className="text-xs font-bold text-foreground">
                {formatNumberEn(goal.total_days)} {isArabic ? "يوم" : "days"}
              </p>
            </div>
            <div className="bg-muted/20 rounded-xl p-2.5 border border-border/30">
              <p className="text-[10px] text-muted-foreground/80 font-semibold mb-1">
                {isArabic ? "النقاط الحالية" : "Current Points"}
              </p>
              <p className="text-xs font-bold text-foreground">
                {formatNumberEn(goal.current_points)}
              </p>
            </div>
            <div className="bg-muted/20 rounded-xl p-2.5 border border-border/30">
              <p className="text-[10px] text-muted-foreground/80 font-semibold mb-1">
                {isArabic ? "النقاط المستهدفة" : "Target Points"}
              </p>
              <p className="text-xs font-bold text-foreground">
                {formatNumberEn(goal.target_points)}
              </p>
            </div>
            <div className="bg-muted/20 rounded-xl p-2.5 border border-border/30">
              <p className="text-[10px] text-muted-foreground/80 font-semibold mb-1">
                {isArabic ? "الحالة" : "Status"}
              </p>
              <p className="text-xs font-bold text-foreground capitalize">
                {goal.status}
              </p>
            </div>
          </div>
          {goal.ai_summary && (
            <div className="mt-3 bg-primary/[0.03] rounded-xl p-2.5 border border-primary/10">
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
