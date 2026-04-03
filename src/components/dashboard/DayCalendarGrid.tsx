"use client";

import { useMemo, useState } from "react";
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
import { cn } from "@/lib/utils";

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

function heatClass(logCount: number) {
  if (logCount <= 0) return "border-border/60 bg-background/45";
  if (logCount === 1) return "border-chart-1/30 bg-chart-1/15";
  if (logCount === 2) return "border-chart-1/40 bg-chart-1/30";
  if (logCount === 3) return "border-chart-1/55 bg-chart-1/50";
  return "border-chart-1/70 bg-chart-1/80";
}

function formatShortNumber(value: number, isArabic: boolean) {
  return new Intl.NumberFormat(isArabic ? "ar-SA" : "en-US").format(value);
}

function formatYearNumber(value: number, isArabic: boolean) {
  return new Intl.NumberFormat(isArabic ? "ar-SA" : "en-US", {
    useGrouping: false,
  }).format(value);
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

  const locale = isArabic ? "ar-SA-u-ca-gregory" : "en-US";
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

    return {
      calendarCells: cells,
      monthStats: {
        loggedDays: loggedCells.length,
        totalPoints: loggedCells.reduce(
          (sum, cell) => sum + cell.totalPoints,
          0,
        ),
        totalEntries: loggedCells.reduce((sum, cell) => sum + cell.logCount, 0),
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
      value: formatShortNumber(monthStats.totalPoints, isArabic),
      accent: "text-primary",
    },
    {
      key: "logged",
      label: labels.loggedDays,
      value: formatShortNumber(monthStats.loggedDays, isArabic),
      accent: "text-foreground",
    },
    {
      key: "remaining",
      label: labels.daysLeft,
      value: formatShortNumber(monthStats.daysRemaining, isArabic),
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
  const isRTLText = (text: string) => /[\u0600-\u06ff]/.test(text);

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

  return (
    <>
      <div
        className="relative w-full flex h-full flex-col overflow-hidden rounded-xl border border-border/70 bg-card/35 p-1.5 shadow-xl ring-1 ring-border/10 backdrop-blur-xl sm:p-2"
        dir={isArabic ? "rtl" : "ltr"}
      >
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

        <div className="border-b border-border/60 pb-1.5 sm:pb-1">
          <div className="flex items-center gap-0.5" dir="ltr">
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
                  className="group flex min-w-0 flex-1 items-center justify-center gap-1 rounded-lg px-1 py-2 sm:py-1 text-center transition-colors hover:bg-muted/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-card"
                  aria-label={isArabic ? "اختيار شهر" : "Choose month"}
                >
                  <span className="truncate text-[14px] font-semibold tracking-tight text-foreground sm:text-[15px]">
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
                        {formatYearNumber(pickerYear, isArabic)}
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

        <div className="mt-2 flex flex-1 flex-col">
          <div className="mb-1 grid grid-cols-7 gap-0.5 px-0.5 sm:mb-1.5 sm:gap-1">
            {weekdayLabels.map((dayLabel, index) => (
              <div
                key={`${dayLabel}-${index}`}
                className="text-center text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/75"
              >
                {dayLabel}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-0.5 sm:gap-1" dir="ltr">
            {calendarCells.map((day, index) => {
              if (!day) {
                return (
                  <div
                    key={`blank-${index}`}
                    className="aspect-square rounded-md bg-transparent"
                  />
                );
              }

              const isSelectable = !day.isBeforeStart && !day.isAfterToday;
              const isSelected = selectedDate === day.date;
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
                    "group relative aspect-square rounded-md border text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-card",
                    day.isBeforeStart || day.isAfterToday
                      ? "border-dashed border-border/35 bg-muted/10 text-muted-foreground/35"
                      : heatClass(day.logCount),
                    day.isToday && !isSelected && "ring-1 ring-primary/55",
                    isSelectable &&
                      "hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-sm",
                    isSelected &&
                      "scale-[1.03] ring-2 ring-primary ring-offset-1 ring-offset-card",
                    day.badge === "strong" &&
                      !day.isBeforeStart &&
                      !day.isAfterToday &&
                      "shadow-[0_0_0_1px_rgba(34,197,94,0.22)]",
                    day.badge === "exceptional" &&
                      !day.isBeforeStart &&
                      !day.isAfterToday &&
                      "shadow-[0_0_0_1px_rgba(245,158,11,0.28)] ring-1 ring-chart-5/35 dark:ring-chart-3/40",
                  )}
                  aria-label={`${day.date} ${day.logCount > 0 ? `${day.logCount} ${labels.logs}` : labels.noActivity}${badgeLabel ? ` ${badgeLabel}` : ""}`}
                >
                  <span
                    className={cn(
                      "absolute left-1 top-1 text-[9px] font-semibold leading-none sm:left-1.5 sm:top-1.5 sm:text-[10px]",
                      day.isBeforeStart || day.isAfterToday
                        ? "text-muted-foreground/40"
                        : day.hasLogs
                          ? "text-foreground"
                          : "text-muted-foreground",
                    )}
                  >
                    {day.dayNum}
                  </span>

                  {day.hasLogs && !day.isBeforeStart && !day.isAfterToday && (
                    <span
                      className={cn(
                        "absolute bottom-1 right-1 h-1 w-1 rounded-full shadow-[0_0_0_2px_rgba(255,255,255,0.14)] sm:bottom-1.5 sm:right-1.5 sm:h-1.5 sm:w-1.5",
                        day.badge === "exceptional"
                          ? "bg-chart-5 dark:bg-chart-3"
                          : day.badge === "strong"
                            ? "bg-chart-2"
                            : "bg-foreground/80 dark:bg-foreground/90",
                      )}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-1.5 flex flex-col gap-1.5 border-t border-border/60 pt-1.5 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
          <div className="min-w-0 flex flex-1 items-center overflow-hidden">
            <div className="inline-flex max-w-full items-center gap-1 overflow-hidden rounded-full border border-border/70 bg-muted/15 px-1.5 py-0.5 text-[9px] font-medium leading-none whitespace-nowrap sm:gap-1.5 sm:px-2.5 sm:py-1 sm:text-[10px]">
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

          <div className="inline-flex shrink-0 items-center justify-start gap-1 text-[9px] text-muted-foreground whitespace-nowrap sm:justify-end sm:gap-1.5 sm:text-[10px]">
            <span>{labels.less}</span>
            {[0, 1, 2, 3, 4].map((intensity) => (
              <div
                key={intensity}
                className={cn(
                  "h-2.5 w-2.5 rounded-[4px] border sm:h-3 sm:w-3",
                  heatClass(intensity),
                )}
              />
            ))}
            <span>{labels.more}</span>
          </div>
        </div>
      </div>

      {tooltip && (
        <div
          className="pointer-events-none fixed z-[200] whitespace-nowrap rounded-lg border border-border bg-popover px-2.5 py-1.5 text-[11px] text-popover-foreground shadow-md"
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
                ? `${tooltip.count} ${labels.logs} · +${formatShortNumber(tooltip.pts, isArabic)} ${labels.points}${tooltip.badgeLabel ? ` · ${tooltip.badgeLabel}` : ""} — ${tooltip.date}`
                : `${labels.noActivity} — ${tooltip.date}`}
        </div>
      )}

      {selectedDate && (
        <div
          className="fixed inset-0 z-[90] flex items-end justify-center"
          onClick={() => setSelectedDate(null)}
        >
          <div className="absolute inset-0 bg-background/70 backdrop-blur-sm" />
          <div
            className="relative flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-t-[22px] border border-border bg-card shadow-2xl"
            onClick={(event) => event.stopPropagation()}
            dir={isArabic ? "rtl" : "ltr"}
          >
            <div className="flex justify-center py-2.5">
              <div className="h-1 w-9 rounded-full bg-muted-foreground/20" />
            </div>

            <div className="flex items-start justify-between gap-3 border-b border-border px-4 pb-3">
              <div>
                <p className="text-[10px] text-muted-foreground">
                  {labels.dayDetail}
                </p>
                <p className="mt-0.5 text-sm font-bold text-foreground">
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
                      "mt-2 inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] ring-1",
                      selectedDayBadge === "exceptional"
                        ? "bg-chart-5/12 text-chart-5 ring-chart-5/20 dark:bg-chart-3/12 dark:text-chart-3 dark:ring-chart-3/20"
                        : "bg-chart-2/12 text-chart-2 ring-chart-2/20",
                    )}
                  >
                    {selectedDayBadgeLabel}
                  </div>
                )}
              </div>

              <div className="flex shrink-0 items-center gap-2 pt-1">
                {selectedLogs.length > 0 && (
                  <div className="flex items-center gap-1 rounded-xl bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary ring-1 ring-primary/20">
                    <Flame className="h-3 w-3" />
                    <span>
                      +
                      {formatShortNumber(
                        selectedLogs.reduce(
                          (sum, log) => sum + (log.ai_score || 0),
                          0,
                        ),
                        isArabic,
                      )}
                    </span>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setSelectedDate(null)}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 space-y-2.5 overflow-y-auto p-4 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-muted/30 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar]:w-1.5">
              {selectedLogs.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
                  <CalendarDays className="h-8 w-8 opacity-20" />
                  <span className="text-sm">{labels.noLogsForDay}</span>
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
                        className="space-y-2 rounded-xl border border-border/50 bg-muted/20 p-3.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] font-medium text-muted-foreground">
                            {new Date(log.created_at).toLocaleTimeString(
                              locale,
                              {
                                hour: "2-digit",
                                minute: "2-digit",
                              },
                            )}
                          </span>
                          <div className="flex items-center gap-1 rounded-lg bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary ring-1 ring-primary/15">
                            <Star className="h-2.5 w-2.5 fill-current" />
                            <span>
                              +{formatShortNumber(log.ai_score ?? 0, isArabic)}
                            </span>
                          </div>
                        </div>

                        {performanceLabel && (
                          <div
                            className={cn(
                              "inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] ring-1",
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
                          className="text-sm font-medium leading-relaxed text-foreground"
                          dir={inputRTL ? "rtl" : "ltr"}
                          style={{ textAlign: inputRTL ? "right" : "left" }}
                        >
                          {log.user_input}
                        </p>

                        {log.ai_feedback && (
                          <div className="flex items-start gap-2 border-t border-border/40 pt-2 text-[11px] text-muted-foreground">
                            <MessageSquare className="mt-0.5 h-3 w-3 shrink-0 text-primary/60" />
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
        </div>
      )}
    </>
  );
}
