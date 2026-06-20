"use client";

import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Flame,
  MessageSquare,
  Star,
  X,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { type Language } from "@/lib/translations";
import { getLocalDateKey } from "@/lib/task-periods";
import {
  getDailyPerformanceLabel,
  parseDailyLogBreakdown,
} from "@/lib/daily-log-feedback";
import { cn, formatNumberEn, hasArabicText, localeWithEnglishDigits } from "@/lib/utils";

interface Log {
  id: string;
  created_at: string;
  user_input: string;
  ai_score: number | null;
  ai_feedback: string;
  breakdown: unknown;
}

interface DayCalendarGridProps {
  logs: Log[];
  goalStartDate: string;
  language?: Language;
  loading?: boolean;
}

interface CalendarCell {
  date: string;
  dayNum: number;
  isBeforeStart: boolean;
  isAfterToday: boolean;
  isToday: boolean;
  hasLogs: boolean;
  logCount: number;
  totalPoints: number;
  badge: "none" | "strong" | "exceptional";
}

function parseLocalDay(value: string) {
  const [year, month, day] = value.split("T")[0].split("-").map(Number);
  const date = new Date(year, (month || 1) - 1, day || 1);
  date.setHours(0, 0, 0, 0);
  return date;
}

function heatClass(value: number, peakValue: number, hasActivity: boolean) {
  if (!hasActivity) return "border-border/55 bg-background/45";

  const ratio = peakValue > 0 ? value / peakValue : 0;
  if (ratio >= 0.85) return "border-transparent bg-primary/90";
  if (ratio >= 0.6) return "border-transparent bg-primary/70";
  if (ratio >= 0.35) return "border-transparent bg-primary/50";
  if (ratio >= 0.15) return "border-transparent bg-primary/32";
  return "border-transparent bg-primary/18";
}

function getDayBadgeLabel(
  badge: "none" | "strong" | "exceptional",
  language: Language,
) {
  if (badge === "none") return null;
  if (language === "ar") {
    return badge === "exceptional" ? "يوم استثنائي" : "يوم قوي";
  }
  return badge === "exceptional" ? "Exceptional Day" : "Strong Day";
}

export default function DayCalendarGrid({
  logs,
  goalStartDate,
  language = "en",
  loading = false,
}: DayCalendarGridProps) {
  const isArabic = language === "ar";
  const labels = {
    currentMonth: isArabic ? "الحالي" : "Current",
    monthPoints: isArabic ? "نقاط" : "Points",
    loggedDays: isArabic ? "مسجل" : "Logged",
    daysLeft: isArabic ? "متبقي" : "Left",
    less: isArabic ? "أقل" : "Less",
    more: isArabic ? "أكثر" : "More",
    noLogsForDay: isArabic ? "لا يوجد سجل لهذا اليوم" : "No logs for this day",
    dayDetail: isArabic ? "تفاصيل اليوم" : "Day detail",
    logs: isArabic ? "سجل" : "logs",
    points: isArabic ? "نقطة" : "pts",
    noActivity: isArabic ? "لا يوجد نشاط" : "No activity",
    beforeStart: isArabic ? "قبل بداية الهدف" : "Before goal start",
    futureDay: isArabic ? "يوم مستقبلي" : "Future day",
  };

  const today = useMemo(() => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  }, []);

  const goalStart = useMemo(
    () => parseLocalDay(goalStartDate),
    [goalStartDate],
  );
  const [viewDate, setViewDate] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1),
  );
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState(() => today.getFullYear());
  const [tooltip, setTooltip] = useState<{
    date: string;
    count: number;
    pts: number;
    x: number;
    y: number;
    state: "active" | "before-start" | "future";
    badgeLabel: string | null;
  } | null>(null);

  const logsByDate = useMemo(() => {
    const map = new Map<string, Log[]>();
    logs.forEach((log) => {
      const dateKey = getLocalDateKey(new Date(log.created_at));
      if (!map.has(dateKey)) {
        map.set(dateKey, []);
      }
      map.get(dateKey)?.push(log);
    });
    return map;
  }, [logs]);

  const locale = localeWithEnglishDigits(language);
  const monthNameFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        month: "long",
      }),
    [locale],
  );
  const weekdayLabels = useMemo(() => {
    const formatter = new Intl.DateTimeFormat(locale, { weekday: "narrow" });
    // Jan 8, 2024 = Monday — gives Mon-Sun order
    return Array.from({ length: 7 }, (_, index) =>
      formatter.format(new Date(2024, 0, 8 + index)),
    );
  }, [locale]);
  const todayWeekdayIndex = (today.getDay() + 6) % 7;

  const { calendarCells, monthStats } = useMemo(() => {
    const viewYear = viewDate.getFullYear();
    const viewMonth = viewDate.getMonth();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    // ISO week: Monday=0 … Sunday=6  (JS getDay: Sun=0, Mon=1…Sat=6)
    const firstDayIndex = (new Date(viewYear, viewMonth, 1).getDay() + 6) % 7;
    const monthStart = new Date(viewYear, viewMonth, 1);
    monthStart.setHours(0, 0, 0, 0);
    const monthEnd = new Date(viewYear, viewMonth, daysInMonth);
    monthEnd.setHours(0, 0, 0, 0);

    const cells: Array<CalendarCell | null> = Array.from(
      { length: 42 },
      (_, index) => {
        const dayNum = index - firstDayIndex + 1;
        if (dayNum < 1 || dayNum > daysInMonth) {
          return null;
        }

        const date = new Date(viewYear, viewMonth, dayNum);
        date.setHours(0, 0, 0, 0);
        const dateKey = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
        const dayLogs = logsByDate.get(dateKey) || [];
        const totalPoints = dayLogs.reduce(
          (sum, log) => sum + (log.ai_score || 0),
          0,
        );
        const badge = dayLogs.some(
          (log) =>
            parseDailyLogBreakdown(log.breakdown).meta?.badge === "exceptional",
        )
          ? "exceptional"
          : dayLogs.some(
                (log) =>
                  parseDailyLogBreakdown(log.breakdown).meta?.badge ===
                  "strong",
              )
            ? "strong"
            : "none";

        return {
          date: dateKey,
          dayNum,
          isBeforeStart: date < goalStart,
          isAfterToday: date > today,
          isToday: date.getTime() === today.getTime(),
          hasLogs: dayLogs.length > 0,
          logCount: dayLogs.length,
          totalPoints,
          badge,
        };
      },
    );

    const validMonthCells = cells.filter(
      (cell): cell is CalendarCell => cell !== null,
    );
    const loggedCells = validMonthCells.filter(
      (cell) => !cell.isBeforeStart && !cell.isAfterToday && cell.hasLogs,
    );

    const peakPoints = loggedCells.reduce(
      (peak, cell) => Math.max(peak, cell.totalPoints),
      0,
    );
    const peakLogCount = loggedCells.reduce(
      (peak, cell) => Math.max(peak, cell.logCount),
      0,
    );

    return {
      calendarCells: cells,
      monthStats: {
        loggedDays: loggedCells.length,
        totalPoints: loggedCells.reduce(
          (sum, cell) => sum + cell.totalPoints,
          0,
        ),
        totalEntries: loggedCells.reduce((sum, cell) => sum + cell.logCount, 0),
        peakActivity: peakPoints > 0 ? peakPoints : peakLogCount,
        daysRemaining:
          monthStart > today
            ? daysInMonth
            : monthEnd < today
              ? 0
              : Math.max(0, daysInMonth - today.getDate()),
      },
    };
  }, [goalStart, logsByDate, today, viewDate]);

  const monthLabel = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        month: "long",
        year: "2-digit",
      }).format(viewDate),
    [locale, viewDate],
  );
  const isViewingCurrentMonth =
    viewDate.getFullYear() === today.getFullYear() &&
    viewDate.getMonth() === today.getMonth();
  const monthPickerItems = useMemo(
    () =>
      Array.from({ length: 12 }, (_, monthIndex) => {
        const date = new Date(pickerYear, monthIndex, 1);
        return {
          monthIndex,
          label: monthNameFormatter.format(date),
          isActive:
            viewDate.getFullYear() === pickerYear &&
            viewDate.getMonth() === monthIndex,
        };
      }),
    [monthNameFormatter, pickerYear, viewDate],
  );

  const monthSummaryItems = [
    {
      key: "points",
      label: labels.monthPoints,
      value: formatNumberEn(monthStats.totalPoints),
      accent: "text-primary",
    },
    {
      key: "logged",
      label: labels.loggedDays,
      value: formatNumberEn(monthStats.loggedDays),
      accent: "text-foreground",
    },
    {
      key: "remaining",
      label: labels.daysLeft,
      value: formatNumberEn(monthStats.daysRemaining),
      accent: "text-muted-foreground",
    },
  ];

  const selectedLogs = selectedDate ? logsByDate.get(selectedDate) || [] : [];
  const selectedDayBadge = selectedLogs.some(
    (log) =>
      parseDailyLogBreakdown(log.breakdown).meta?.badge === "exceptional",
  )
    ? "exceptional"
    : selectedLogs.some(
          (log) =>
            parseDailyLogBreakdown(log.breakdown).meta?.badge === "strong",
        )
      ? "strong"
      : "none";
  const selectedDayBadgeLabel = getDayBadgeLabel(selectedDayBadge, language);
  const isRTLText = hasArabicText;

  const handleMonthPickerOpenChange = (open: boolean) => {
    setIsMonthPickerOpen(open);
    if (open) {
      setPickerYear(viewDate.getFullYear());
    }
  };

  const handleSelectMonth = (monthIndex: number) => {
    setSelectedDate(null);
    setTooltip(null);
    setViewDate(new Date(pickerYear, monthIndex, 1));
    setIsMonthPickerOpen(false);
  };

  if (loading) {
    return (
      <div className="relative flex h-full w-full flex-col overflow-hidden rounded-xl border border-transparent bg-card/35 p-1 shadow-sm backdrop-blur-xl sm:p-2">
        <div className="rounded-lg border border-border/45 bg-background/45 p-0.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] sm:p-1">
          <div className="flex items-center gap-0.5" dir="ltr">
            <div className="h-7 w-7 shrink-0 rounded-lg bg-muted/40 animate-pulse" />
            <div className="mx-auto h-4 w-24 rounded-md bg-muted/40 animate-pulse" />
            <div className="h-7 w-7 shrink-0 rounded-lg bg-muted/40 animate-pulse" />
          </div>
        </div>
        <div className="mt-1 flex flex-1 flex-col sm:mt-1.5">
          <div className="mb-1 grid grid-cols-7 gap-0.5 rounded-lg border border-border/35 bg-muted/10 p-0.5 sm:mb-1.5 sm:gap-1">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="h-5 rounded-md bg-muted/30 animate-pulse sm:h-6" />
            ))}
          </div>
          <div className="grid grid-cols-7 gap-0.5 sm:gap-1 flex-1">
            {Array.from({ length: 42 }).map((_, i) => (
              <div key={i} className="h-6 rounded-md bg-muted/20 animate-pulse min-[390px]:h-7 min-[500px]:h-8 md:aspect-square md:h-auto" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div
        className="relative flex h-full w-full flex-col overflow-hidden rounded-2xl border border-border/40 bg-card/40 p-1.5 shadow-[0_1px_3px_-1px_rgba(0,0,0,0.03)] backdrop-blur-xl sm:p-2.5 dark:shadow-[0_1px_3px_-1px_rgba(0,0,0,0.15)]"
        dir={isArabic ? "rtl" : "ltr"}
      >
        <div className="rounded-xl border border-border/40 bg-background/50 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] sm:p-1.5">
          <div className="flex items-center gap-1" dir="ltr">
            <button
              type="button"
              onClick={() => {
                setSelectedDate(null);
                setTooltip(null);
                setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
              }}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
              aria-label={isArabic ? "الشهر السابق" : "Previous month"}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>

            <Popover
              open={isMonthPickerOpen}
              onOpenChange={handleMonthPickerOpenChange}
            >
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="group flex min-w-0 flex-1 items-center justify-center gap-1 rounded-lg px-1 py-1 text-center transition-colors hover:bg-muted/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-card"
                  aria-label={isArabic ? "اختيار شهر" : "Choose month"}
                >
                  <span className="truncate text-xs font-semibold tracking-tight text-foreground sm:text-[15px]">
                    {monthLabel}
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
                </button>
              </PopoverTrigger>

              <PopoverContent
                align={isArabic ? "start" : "center"}
                className="w-[17rem] rounded-xl border-border/70 bg-background/98 p-3 shadow-xl backdrop-blur"
                dir={isArabic ? "rtl" : "ltr"}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => setPickerYear((current) => current - 1)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-border/70 text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
                      aria-label={isArabic ? "السنة السابقة" : "Previous year"}
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </button>

                    <div className="min-w-0 flex-1 text-center">
                      <p className="text-sm font-semibold text-foreground">
                        {formatNumberEn(pickerYear, { useGrouping: false })}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setPickerYear((current) => current + 1)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-border/70 text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
                      aria-label={isArabic ? "السنة التالية" : "Next year"}
                    >
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5">
                    {monthPickerItems.map((item) => (
                      <button
                        key={`${pickerYear}-${item.monthIndex}`}
                        type="button"
                        onClick={() => handleSelectMonth(item.monthIndex)}
                        className={cn(
                          "min-h-9 rounded-lg px-2 text-[11px] font-medium transition-colors",
                          item.isActive
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "border border-border/70 bg-muted/20 text-muted-foreground hover:bg-muted/45 hover:text-foreground",
                        )}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            <button
              type="button"
              onClick={() => {
                setSelectedDate(null);
                setTooltip(null);
                setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
              }}
              disabled={
                viewDate.getFullYear() === today.getFullYear() &&
                viewDate.getMonth() === today.getMonth()
              }
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
              aria-label={isArabic ? "الشهر التالي" : "Next month"}
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div className="mt-1 flex flex-1 flex-col sm:mt-1.5">
          <div
            className="mb-1 grid grid-cols-7 gap-0.5 rounded-lg border border-border/35 bg-muted/10 p-0.5 sm:mb-1.5 sm:gap-1"
            dir="ltr"
          >
            {weekdayLabels.map((dayLabel, index) => {
              const isCurrentWeekday =
                isViewingCurrentMonth && index === todayWeekdayIndex;

              return (
                <div
                  key={`${dayLabel}-${index}`}
                  aria-current={isCurrentWeekday ? "date" : undefined}
                  className={cn(
                    "flex h-5 items-center justify-center rounded-md border text-[10px] font-bold leading-none transition-colors min-[390px]:h-[22px] sm:h-6 sm:text-[11px]",
                    isCurrentWeekday
                      ? "border-primary/45 bg-primary/12 text-primary shadow-sm"
                      : "border-border/55 bg-background/50 text-muted-foreground/80",
                  )}
                >
                  {dayLabel}
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-7 gap-0.5 sm:gap-1" dir="ltr">
            {calendarCells.map((day, index) => {
              if (!day) {
                return (
                  <div
                    key={`blank-${index}`}
                    className="h-6 rounded-lg bg-transparent min-[390px]:h-7 min-[500px]:h-8 md:aspect-square md:h-auto"
                  />
                );
              }

              const isSelectable = !day.isBeforeStart && !day.isAfterToday;
              const isSelected = selectedDate === day.date;
              const activityValue = day.totalPoints > 0 ? day.totalPoints : day.logCount;
              const state = day.isBeforeStart
                ? "before-start"
                : day.isAfterToday
                  ? "future"
                  : "active";
              const badgeLabel = getDayBadgeLabel(day.badge, language);

              return (
                <button
                  key={day.date}
                  type="button"
                  onClick={() =>
                    isSelectable &&
                    setSelectedDate(isSelected ? null : day.date)
                  }
                  onMouseEnter={(event) => {
                    const rect = event.currentTarget.getBoundingClientRect();
                    setTooltip({
                      date: day.date,
                      count: day.logCount,
                      pts: day.totalPoints,
                      x: rect.left + rect.width / 2,
                      y: rect.top,
                      state,
                      badgeLabel,
                    });
                  }}
                  onMouseLeave={() => setTooltip(null)}
                  className={cn(
                    "group relative h-6 rounded-lg border text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-1 focus-visible:ring-offset-card min-[390px]:h-7 min-[500px]:h-8 md:aspect-square md:h-auto",
                    day.isBeforeStart || day.isAfterToday
                      ? "border-border/30 bg-muted/[0.08] text-muted-foreground/30"
                      : heatClass(activityValue, monthStats.peakActivity, day.hasLogs),
                    day.isToday && !isSelected && !day.hasLogs && "ring-2 ring-primary/20 ring-inset shadow-sm",
                    isSelectable &&
                      "hover:-translate-y-0.5 hover:bg-primary/8 hover:shadow-md hover:shadow-primary/10 active:scale-95",
                    isSelected &&
                      "scale-[1.02] brightness-95 ring-2 ring-primary/30 ring-inset",
                    day.badge === "strong" &&
                      !day.isBeforeStart &&
                      !day.isAfterToday &&
                      "shadow-sm shadow-chart-2/20",
                    day.badge === "exceptional" &&
                      !day.isBeforeStart &&
                      !day.isAfterToday &&
                      "shadow-md shadow-chart-5/20",
                  )}
                  aria-label={`${day.date} ${day.logCount > 0 ? `${day.logCount} ${labels.logs}` : labels.noActivity}${badgeLabel ? ` ${badgeLabel}` : ""}`}
                >
                  <span
                    className={cn(
                      "absolute left-1 top-0.5 text-[10px] font-bold leading-none min-[390px]:top-1 min-[390px]:text-[11px] sm:left-1.5 sm:top-1.5 sm:text-xs",
                      day.isBeforeStart || day.isAfterToday
                        ? "text-muted-foreground/35"
                        : day.hasLogs
                          ? day.logCount >= 3
                            ? "text-primary-foreground drop-shadow-sm"
                            : "text-foreground"
                          : "text-muted-foreground",
                    )}
                  >
                    {day.dayNum}
                  </span>

                  {day.hasLogs && !day.isBeforeStart && !day.isAfterToday && (
                    <span
                      className={cn(
                        "absolute bottom-0.5 right-1 h-1.5 w-1.5 rounded-full opacity-90 min-[390px]:bottom-1 sm:bottom-1.5 sm:right-1.5 sm:h-2 sm:w-2 ring-2 ring-background",
                        day.badge === "exceptional"
                          ? "bg-chart-5 dark:bg-chart-3"
                          : day.badge === "strong"
                            ? "bg-chart-2"
                            : "bg-foreground/70 dark:bg-foreground/80",
                      )}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-1 flex items-center justify-between gap-1.5 overflow-hidden pt-1 sm:mt-1.5 sm:gap-2 sm:pt-1.5">
          <div className="min-w-0 flex flex-1 items-center overflow-hidden">
            <div className="inline-flex max-w-full items-center gap-1 overflow-hidden rounded-full bg-muted/15 px-1.5 py-0.5 text-[10px] font-medium leading-none whitespace-nowrap sm:gap-1.5 sm:px-2.5 sm:py-1">
              {monthSummaryItems.map((item, index) => (
                <span
                  key={item.key}
                  className="inline-flex items-center gap-1.5"
                >
                  <span className="inline-flex items-center gap-1 whitespace-nowrap">
                    <span
                      className={cn("font-semibold tabular-nums", item.accent)}
                    >
                      {item.value}
                    </span>
                    <span className="text-muted-foreground">{item.label}</span>
                  </span>
                  {index < monthSummaryItems.length - 1 && (
                    <span
                      aria-hidden="true"
                      className="h-3 w-px shrink-0 rounded-full bg-border/60"
                    />
                  )}
                </span>
              ))}
            </div>
          </div>

          <div className="inline-flex shrink-0 items-center justify-start gap-1 text-[10px] text-muted-foreground whitespace-nowrap sm:justify-end sm:gap-1.5">
            <span>{labels.less}</span>
            {[0, 1, 2, 3, 4].map((intensity) => (
              <div
                key={intensity}
                className={cn(
                  "h-2.5 w-2.5 rounded-[4px] border sm:h-3 sm:w-3",
                  intensity === 0
                    ? heatClass(0, 1, false)
                    : heatClass(intensity, 4, true),
                )}
              />
            ))}
            <span>{labels.more}</span>
          </div>
        </div>
      </div>

      {tooltip && (
        <div
          className="pointer-events-none fixed z-[200] whitespace-nowrap rounded-xl border border-border/50 bg-popover px-3 py-2 text-xs text-popover-foreground shadow-lg shadow-black/10"
          style={{
            left: tooltip.x,
            top: tooltip.y,
            transform: "translate(-50%, calc(-100% - 8px))",
          }}
        >
          {tooltip.state === "before-start"
            ? `${labels.beforeStart} — ${tooltip.date}`
            : tooltip.state === "future"
              ? `${labels.futureDay} — ${tooltip.date}`
              : tooltip.count > 0
                ? `${formatNumberEn(tooltip.count)} ${labels.logs} · +${formatNumberEn(tooltip.pts)} ${labels.points}${tooltip.badgeLabel ? ` · ${tooltip.badgeLabel}` : ""} — ${tooltip.date}`
                : `${labels.noActivity} — ${tooltip.date}`}
        </div>
      )}

      {selectedDate && typeof document !== "undefined" && createPortal(
        <div
          className="fixed inset-0 z-[120] flex items-end justify-center bg-background/60 p-0 backdrop-blur-md sm:p-4 lg:items-center"
          onClick={() => setSelectedDate(null)}
        >
          <div
            className="relative flex max-h-[calc(100dvh-0.75rem-env(safe-area-inset-bottom))] w-full max-w-none flex-col overflow-hidden rounded-t-[24px] border border-border/60 bg-card shadow-2xl shadow-black/10 sm:max-h-[85vh] sm:w-[min(calc(100vw-2rem),28rem)] sm:rounded-[24px] lg:w-[min(calc(100vw-3rem),42rem)] lg:max-w-2xl lg:rounded-2xl"
            onClick={(event) => event.stopPropagation()}
            dir={isArabic ? "rtl" : "ltr"}
          >
            <div className="flex justify-center py-3">
              <div className="h-1 w-10 rounded-full bg-muted-foreground/20" />
            </div>

            <div className="flex items-start justify-between gap-4 border-b border-border/40 px-4 pb-3 sm:px-5 sm:pb-4">
              <div>
                <p className="text-[11px] font-bold text-muted-foreground/70 uppercase tracking-wider">
                  {labels.dayDetail}
                </p>
                <p className="mt-1 text-[15px] font-extrabold text-foreground sm:text-base">
                  {new Date(`${selectedDate}T12:00:00`).toLocaleDateString(
                    locale,
                    {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                    },
                  )}
                </p>
                {selectedDayBadgeLabel && (
                  <div
                    className={cn(
                      "mt-2.5 inline-flex items-center rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] ring-1",
                      selectedDayBadge === "exceptional"
                        ? "bg-chart-5/12 text-chart-5 ring-chart-5/20 dark:bg-chart-3/12 dark:text-chart-3 dark:ring-chart-3/20"
                        : "bg-chart-2/12 text-chart-2 ring-chart-2/20",
                    )}
                  >
                    {selectedDayBadgeLabel}
                  </div>
                )}
              </div>

              <div className="flex shrink-0 items-center gap-2.5 pt-1">
                {selectedLogs.length > 0 && (
                  <div className="flex items-center gap-1.5 rounded-xl bg-primary/[0.1] px-3 py-1.5 text-xs font-bold text-primary ring-1 ring-primary/20 shadow-sm">
                    <Flame className="h-3.5 w-3.5" />
                    <span>
                      +
                      {formatNumberEn(
                        selectedLogs.reduce(
                          (sum, log) => sum + (log.ai_score || 0),
                          0,
                        )
                      )}
                    </span>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setSelectedDate(null)}
                  className="flex h-8 w-8 items-center justify-center rounded-xl text-muted-foreground transition-all duration-200 hover:bg-muted/60 hover:text-foreground active:scale-95"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto p-4 sm:space-y-3.5 sm:p-5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-muted/30 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar]:w-1.5">
              {selectedLogs.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 py-10 text-muted-foreground sm:py-14">
                  <CalendarDays className="h-10 w-10 opacity-25" />
                  <span className="text-sm font-semibold">{labels.noLogsForDay}</span>
                </div>
              ) : (
                selectedLogs
                  .slice()
                  .sort(
                    (a, b) =>
                      new Date(b.created_at).getTime() -
                      new Date(a.created_at).getTime(),
                  )
                  .map((log) => {
                    const inputRTL = isRTLText(log.user_input);
                    const feedbackRTL = log.ai_feedback
                      ? isRTLText(log.ai_feedback)
                      : false;
                    const performanceMeta = parseDailyLogBreakdown(
                      log.breakdown,
                    ).meta;
                    const performanceLabel = getDailyPerformanceLabel(
                      performanceMeta,
                      language,
                    );

                    return (
                      <div
                        key={log.id}
                        className="space-y-2.5 rounded-xl border border-border/40 bg-muted/[0.04] p-4 shadow-sm transition-all duration-200 hover:border-border/60 hover:shadow-md"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] font-bold text-muted-foreground/70">
                            {new Date(log.created_at).toLocaleTimeString(
                              locale,
                              {
                                hour: "2-digit",
                                minute: "2-digit",
                              },
                            )}
                          </span>
                          <div className="flex items-center gap-1.5 rounded-xl bg-primary/[0.08] px-2.5 py-1 text-xs font-bold text-primary ring-1 ring-primary/20 shadow-sm">
                            <Star className="h-3 w-3 fill-current" />
                            <span>
                              +{formatNumberEn(log.ai_score ?? 0)}
                            </span>
                          </div>
                        </div>

                        {performanceLabel && (
                          <div
                            className={cn(
                              "inline-flex items-center rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] ring-1 shadow-sm",
                              performanceMeta?.performance_tier ===
                                "exceptional"
                                ? "bg-chart-5/12 text-chart-5 ring-chart-5/20 dark:bg-chart-3/12 dark:text-chart-3 dark:ring-chart-3/20"
                                : performanceMeta?.performance_tier === "strong"
                                  ? "bg-chart-2/12 text-chart-2 ring-chart-2/20"
                                  : performanceMeta?.performance_tier === "weak"
                                    ? "bg-destructive/10 text-destructive ring-destructive/20"
                                    : "bg-amber-500/10 text-amber-700 ring-amber-500/20 dark:text-amber-300",
                            )}
                          >
                            {performanceLabel}
                          </div>
                        )}

                        <p
                          className="text-sm font-semibold leading-relaxed text-foreground"
                          dir={inputRTL ? "rtl" : "ltr"}
                          style={{ textAlign: inputRTL ? "right" : "left" }}
                        >
                          {log.user_input}
                        </p>

                        {log.ai_feedback && (
                          <div className="flex items-start gap-2.5 border-t border-border/30 pt-2.5 text-xs text-muted-foreground/80">
                            <MessageSquare className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary/50" />
                            <p
                              className="italic leading-relaxed"
                              dir={feedbackRTL ? "rtl" : "ltr"}
                              style={{
                                textAlign: feedbackRTL ? "right" : "left",
                              }}
                            >
                              {log.ai_feedback}
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })
              )}
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
