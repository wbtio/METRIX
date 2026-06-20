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
    <div className="rounded-2xl border border-border/50 bg-card p-4 sm:p-5 space-y-4 shadow-[0_1px_3px_-1px_rgba(0,0,0,0.04)] dark:shadow-[0_1px_3px_-1px_rgba(0,0,0,0.15)] dark:bg-card/50 backdrop-blur-[2px]">
      <div className="flex items-start justify-between gap-3 sm:gap-4">
        <div
          className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0"
          dir={isArabic ? "rtl" : "ltr"}
        >
          <GoalIconPicker
            currentIconName={goal.icon || "Target"}
            onSelect={onUpdateIcon}
          >
            <button className="h-11 w-11 sm:h-12 sm:w-12 p-2.5 shrink-0 bg-primary/[0.07] text-primary hover:bg-primary/[0.14] active:scale-95 transition-all duration-200 rounded-xl flex items-center justify-center cursor-pointer border border-primary/[0.12] ring-2 ring-transparent hover:ring-primary/10 shadow-sm">
              <span className="transition-transform duration-200 hover:scale-110">
                {getGoalIcon(goal.icon)}
              </span>
            </button>
          </GoalIconPicker>
          <div className="min-w-0 flex-1">
            <h1
              className={cn(
                "text-base sm:text-[17px] font-extrabold text-foreground line-clamp-2 tracking-tight leading-snug",
                titleDir === "rtl" ? "text-right" : "text-left",
              )}
              dir={titleDir}
            >
              {goal.title}
            </h1>
            <div className="mt-2 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1.5">
              {goal.is_pinned && (
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-500/[0.09] px-2.5 py-1 text-[11px] font-bold text-amber-700 dark:text-amber-400 border border-amber-500/[0.14] shadow-sm shadow-amber-500/5">
                  <Pin className="w-3 h-3" /> {isArabic ? "مثبت" : "Pinned"}
                </span>
              )}
              {goalEndDaysChip && (
                <span
                  className={cn(
                    "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold tabular-nums border shadow-sm",
                    goalEndDaysChip.tone === "soon" &&
                      "bg-primary/[0.07] text-primary border-primary/[0.14] shadow-primary/5",
                    goalEndDaysChip.tone === "today" &&
                      "bg-amber-500/[0.08] text-amber-700 dark:text-amber-400 border-amber-500/[0.14] shadow-amber-500/5",
                    goalEndDaysChip.tone === "late" &&
                      "bg-destructive/[0.07] text-destructive border-destructive/[0.14] shadow-destructive/5",
                  )}
                  title={goalEndDaysChip.title}
                >
                  <Clock className="w-3 h-3 shrink-0" aria-hidden />
                  <span className="truncate">{goalEndDaysChip.text}</span>
                </span>
              )}
              {streak > 0 && (
                <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-chart-5/[0.08] px-2.5 py-1 text-[11px] font-bold text-chart-5 dark:text-chart-3 border border-chart-5/[0.14] shadow-sm shadow-chart-5/5">
                  <Flame className="w-3 h-3" /> {formatNumberEn(streak)}
                </span>
              )}
              {taskCount > 0 && (
                <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-muted/50 px-2.5 py-1 text-[11px] font-bold text-primary tabular-nums border border-border/40 shadow-sm">
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

        <div className="flex items-center gap-1.5 shrink-0">
          <DropdownMenu dir={isArabic ? "rtl" : "ltr"}>
            <DropdownMenuTrigger asChild>
              <button
                className="p-2.5 rounded-xl hover:bg-muted/60 text-muted-foreground/70 hover:text-foreground transition-all duration-200 border border-border/30 hover:border-border/60 hover:shadow-sm active:scale-95"
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
          className="pt-4 border-t border-border/25 animate-in fade-in slide-in-from-top-3 duration-300"
          dir={isArabic ? "rtl" : "ltr"}
        >
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            <div className="bg-muted/[0.03] rounded-xl p-3 border border-border/30 hover:border-border/50 hover:bg-muted/[0.06] transition-colors duration-200 group">
              <p className="text-[10px] text-muted-foreground/70 font-semibold mb-1.5 uppercase tracking-wider">
                {isArabic ? "تاريخ البدء" : "Start Date"}
              </p>
              <p className="text-xs font-extrabold text-foreground group-hover:text-primary transition-colors">
                {new Date(goal.created_at).toLocaleDateString(dateLocale, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            </div>
            <div className="bg-muted/[0.03] rounded-xl p-3 border border-border/30 hover:border-border/50 hover:bg-muted/[0.06] transition-colors duration-200 group">
              <p className="text-[10px] text-muted-foreground/70 font-semibold mb-1.5 uppercase tracking-wider">
                {isArabic ? "تاريخ الانتهاء" : "End Date"}
              </p>
              <p className="text-xs font-extrabold text-foreground group-hover:text-primary transition-colors">
                {new Date(goal.estimated_completion_date).toLocaleDateString(
                  dateLocale,
                  { month: "short", day: "numeric", year: "numeric" },
                )}
              </p>
            </div>
            <div className="bg-muted/[0.03] rounded-xl p-3 border border-border/30 hover:border-border/50 hover:bg-muted/[0.06] transition-colors duration-200 group">
              <p className="text-[10px] text-muted-foreground/70 font-semibold mb-1.5 uppercase tracking-wider">
                {isArabic ? "إجمالي الأيام" : "Total Days"}
              </p>
              <p className="text-xs font-extrabold text-foreground group-hover:text-primary transition-colors">
                {formatNumberEn(goal.total_days)} {isArabic ? "يوم" : "days"}
              </p>
            </div>
            <div className="bg-muted/[0.03] rounded-xl p-3 border border-border/30 hover:border-border/50 hover:bg-muted/[0.06] transition-colors duration-200 group">
              <p className="text-[10px] text-muted-foreground/70 font-semibold mb-1.5 uppercase tracking-wider">
                {isArabic ? "النقاط الحالية" : "Current Points"}
              </p>
              <p className="text-xs font-extrabold text-foreground group-hover:text-primary transition-colors">
                {formatNumberEn(goal.current_points)}
              </p>
            </div>
            <div className="bg-muted/[0.03] rounded-xl p-3 border border-border/30 hover:border-border/50 hover:bg-muted/[0.06] transition-colors duration-200 group">
              <p className="text-[10px] text-muted-foreground/70 font-semibold mb-1.5 uppercase tracking-wider">
                {isArabic ? "النقاط المستهدفة" : "Target Points"}
              </p>
              <p className="text-xs font-extrabold text-foreground group-hover:text-primary transition-colors">
                {formatNumberEn(goal.target_points)}
              </p>
            </div>
            <div className="bg-muted/[0.03] rounded-xl p-3 border border-border/30 hover:border-border/50 hover:bg-muted/[0.06] transition-colors duration-200 group">
              <p className="text-[10px] text-muted-foreground/70 font-semibold mb-1.5 uppercase tracking-wider">
                {isArabic ? "الحالة" : "Status"}
              </p>
              <p className="text-xs font-extrabold text-foreground capitalize group-hover:text-primary transition-colors">
                {goal.status}
              </p>
            </div>
          </div>
          {goal.ai_summary && (
            <div className="mt-4 bg-primary/[0.025] rounded-xl p-3 border border-primary/[0.08] hover:border-primary/15 transition-colors duration-200">
              <p className="text-[10px] text-primary/80 font-bold mb-1.5 uppercase tracking-wider">
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
