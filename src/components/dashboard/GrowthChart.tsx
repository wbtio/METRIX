"use client";

import { useId, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts";
import { BarChart2, Layers, TrendingUp } from "lucide-react";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { translations, type Language } from "@/lib/translations";
import { cn } from "@/lib/utils";

type TimeRange = "week" | "month" | "year" | "all";
type ChartType = "bar" | "line" | "area";
type BucketMode = "day" | "month";

interface GrowthChartProps {
  data: { date: string; points: number }[];
  language?: Language;
  className?: string;
  fillHeight?: boolean;
  embedded?: boolean;
}

function parseLocalDay(value: string) {
  const [year, month, day] = value.split("T")[0].split("-").map(Number);
  const date = new Date(year, (month || 1) - 1, day || 1);
  date.setHours(0, 0, 0, 0);
  return date;
}

function formatNumber(value: number, isArabic: boolean) {
  return new Intl.NumberFormat(isArabic ? "ar-SA" : "en-US", {
    maximumFractionDigits: value >= 10 ? 0 : 1,
  }).format(value);
}

export default function GrowthChart({
  data,
  language = "en",
  className,
  fillHeight = false,
  embedded = false,
}: GrowthChartProps) {
  const t = translations[language];
  const isArabic = language === "ar";
  const [timeRange, setTimeRange] = useState<TimeRange>("month");
  const [chartType, setChartType] = useState<ChartType>("bar");
  const gradientId = useId().replace(/:/g, "");

  const labels = {
    noRangeData: isArabic
      ? "لا يوجد نشاط ضمن هذا النطاق بعد."
      : "No activity in this range yet.",
  };

  const locale = isArabic ? "ar-SA-u-ca-gregory" : "en-US";
  const shortDayFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        month: "short",
        day: "numeric",
      }),
    [locale],
  );
  const weekDayFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        weekday: "short",
        day: "numeric",
      }),
    [locale],
  );
  const shortMonthFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        month: "short",
      }),
    [locale],
  );
  const shortMonthYearFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        month: "short",
        year: "2-digit",
      }),
    [locale],
  );
  const longDayFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        month: "long",
        day: "numeric",
        year: "numeric",
      }),
    [locale],
  );
  const longMonthYearFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        month: "long",
        year: "numeric",
      }),
    [locale],
  );

  const chartConfig = useMemo<ChartConfig>(
    () => ({
      points: {
        label: isArabic ? "النقاط" : "Points",
        color: "var(--chart-1)",
      },
    }),
    [isArabic],
  );
  const chartMargin = { top: 6, right: 4, left: -8, bottom: 0 };

  const filteredData = useMemo(() => {
    if (!data || data.length === 0) {
      return [];
    }

    const now = new Date();
    now.setHours(23, 59, 59, 999);

    let cutoffDate = new Date(0);
    if (timeRange === "week") {
      cutoffDate = new Date(now);
      cutoffDate.setDate(now.getDate() - 6);
      cutoffDate.setHours(0, 0, 0, 0);
    } else if (timeRange === "month") {
      cutoffDate = new Date(now);
      cutoffDate.setDate(now.getDate() - 29);
      cutoffDate.setHours(0, 0, 0, 0);
    } else if (timeRange === "year") {
      cutoffDate = new Date(now);
      cutoffDate.setDate(now.getDate() - 364);
      cutoffDate.setHours(0, 0, 0, 0);
    }

    return data.filter((entry) => {
      const entryDate = parseLocalDay(entry.date);
      return entryDate >= cutoffDate && entryDate <= now;
    });
  }, [data, timeRange]);

  const bucketMode: BucketMode =
    timeRange === "year" || timeRange === "all" ? "month" : "day";

  const chartData = useMemo(() => {
    if (filteredData.length === 0) {
      return [];
    }

    const buckets = new Map<string, { rawDate: string; points: number }>();

    filteredData.forEach((entry) => {
      const entryDate = parseLocalDay(entry.date);
      const rawDate =
        bucketMode === "month"
          ? `${entryDate.getFullYear()}-${String(entryDate.getMonth() + 1).padStart(2, "0")}-01`
          : entry.date;

      const existing = buckets.get(rawDate) ?? { rawDate, points: 0 };
      existing.points += entry.points;
      buckets.set(rawDate, existing);
    });

    return Array.from(buckets.values())
      .sort(
        (a, b) =>
          parseLocalDay(a.rawDate).getTime() -
          parseLocalDay(b.rawDate).getTime(),
      )
      .map((entry) => {
        const entryDate = parseLocalDay(entry.rawDate);
        const label =
          bucketMode === "month"
            ? timeRange === "all"
              ? shortMonthYearFormatter.format(entryDate)
              : shortMonthFormatter.format(entryDate)
            : timeRange === "week"
              ? weekDayFormatter.format(entryDate)
              : shortDayFormatter.format(entryDate);

        const fullLabel =
          bucketMode === "month"
            ? longMonthYearFormatter.format(entryDate)
            : longDayFormatter.format(entryDate);

        return {
          date: entry.rawDate,
          label,
          fullLabel,
          points: entry.points,
        };
      });
  }, [
    bucketMode,
    filteredData,
    longDayFormatter,
    longMonthYearFormatter,
    shortDayFormatter,
    shortMonthFormatter,
    shortMonthYearFormatter,
    timeRange,
    weekDayFormatter,
  ]);

  const maxBarSize =
    chartData.length <= 7 ? 40 : chartData.length <= 12 ? 28 : 18;
  const showDots = chartData.length <= 18;
  const chartViewportClass = fillHeight
    ? "aspect-auto h-full min-h-[200px] w-full flex-1 sm:min-h-[240px] lg:min-h-[262px]"
    : "aspect-auto h-[180px] w-full sm:h-[196px] lg:h-[208px]";
  const emptyStateClass = fillHeight
    ? "h-full min-h-[200px] sm:min-h-[240px] lg:min-h-[262px]"
    : "h-[180px] sm:h-[196px] lg:h-[208px]";

  const containerClass = cn(
    embedded
      ? "rounded-none border-0 bg-transparent p-0 shadow-none ring-0 hover:bg-transparent"
      : "relative flex flex-col overflow-hidden rounded-xl border border-border/70 bg-card/35 p-1.5 shadow-xl ring-1 ring-border/10 backdrop-blur-xl sm:p-2",
    fillHeight && "h-full min-h-0",
    className,
  );

  const timeRangeOptions: { key: TimeRange; label: string }[] = [
    { key: "week", label: t.thisWeek },
    { key: "month", label: t.thisMonth },
    { key: "year", label: t.thisYear },
    { key: "all", label: t.allTime },
  ];

  const chartTypeOptions: {
    key: ChartType;
    label: string;
    icon: React.ReactNode;
  }[] = [
    { key: "bar", label: t.barChart, icon: <BarChart2 className="h-3 w-3" /> },
    {
      key: "line",
      label: t.lineChart,
      icon: <TrendingUp className="h-3 w-3" />,
    },
    { key: "area", label: t.areaChart, icon: <Layers className="h-3 w-3" /> },
  ];

  const renderChart = () => {
    const tooltipContent = (
      <ChartTooltipContent
        className="border-border/70 bg-background/95 backdrop-blur-md"
        indicator={chartType === "bar" ? "dashed" : "line"}
        labelFormatter={(_, payload) => payload?.[0]?.payload?.fullLabel ?? ""}
      />
    );

    switch (chartType) {
      case "line":
        return (
          <LineChart data={chartData} margin={chartMargin}>
            <CartesianGrid
              vertical={false}
              strokeDasharray="4 4"
              className="stroke-border/50"
            />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={24}
              height={34}
              className="text-[11px] fill-muted-foreground"
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={6}
              width={30}
              allowDecimals={false}
              tickCount={4}
              className="text-[11px] fill-muted-foreground"
              tickFormatter={(value: number) => formatNumber(value, isArabic)}
            />
            <ChartTooltip
              cursor={{ stroke: "var(--border)", strokeWidth: 1 }}
              content={tooltipContent}
            />
            <Line
              dataKey="points"
              type="monotone"
              stroke="var(--color-points)"
              strokeWidth={2.75}
              dot={
                showDots
                  ? {
                      fill: "var(--color-points)",
                      r: 3.5,
                      strokeWidth: 2,
                      stroke: "var(--background)",
                    }
                  : false
              }
              activeDot={{
                r: 5,
                strokeWidth: 2,
                stroke: "var(--background)",
              }}
            />
          </LineChart>
        );

      case "area":
        return (
          <AreaChart data={chartData} margin={chartMargin}>
            <defs>
              <linearGradient
                id={`growth-gradient-${gradientId}`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop
                  offset="0%"
                  stopColor="var(--color-points)"
                  stopOpacity={0.35}
                />
                <stop
                  offset="100%"
                  stopColor="var(--color-points)"
                  stopOpacity={0.04}
                />
              </linearGradient>
            </defs>
            <CartesianGrid
              vertical={false}
              strokeDasharray="4 4"
              className="stroke-border/50"
            />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={24}
              height={34}
              className="text-[11px] fill-muted-foreground"
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={6}
              width={30}
              allowDecimals={false}
              tickCount={4}
              className="text-[11px] fill-muted-foreground"
              tickFormatter={(value: number) => formatNumber(value, isArabic)}
            />
            <ChartTooltip
              cursor={{ stroke: "var(--border)", strokeWidth: 1 }}
              content={tooltipContent}
            />
            <Area
              dataKey="points"
              type="monotone"
              stroke="var(--color-points)"
              strokeWidth={2.5}
              fill={`url(#growth-gradient-${gradientId})`}
              dot={
                showDots
                  ? {
                      fill: "var(--color-points)",
                      r: 3,
                      strokeWidth: 2,
                      stroke: "var(--background)",
                    }
                  : false
              }
              activeDot={{
                r: 5,
                strokeWidth: 2,
                stroke: "var(--background)",
              }}
            />
          </AreaChart>
        );

      case "bar":
      default:
        return (
          <BarChart data={chartData} margin={chartMargin}>
            <CartesianGrid
              vertical={false}
              strokeDasharray="4 4"
              className="stroke-border/50"
            />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={24}
              height={34}
              className="text-[11px] fill-muted-foreground"
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={6}
              width={30}
              allowDecimals={false}
              tickCount={4}
              className="text-[11px] fill-muted-foreground"
              tickFormatter={(value: number) => formatNumber(value, isArabic)}
            />
            <ChartTooltip
              cursor={{ fill: "var(--muted)", opacity: 0.2 }}
              content={tooltipContent}
            />
            <Bar
              dataKey="points"
              fill="var(--color-points)"
              radius={[8, 8, 2, 2]}
              maxBarSize={maxBarSize}
            />
          </BarChart>
        );
    }
  };

  return (
    <div className={containerClass} dir={isArabic ? "rtl" : "ltr"}>
      {!embedded && (
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
      )}

      <div className="border-b border-border/60 pb-1.5 sm:pb-1">
        <div className="flex flex-wrap items-center justify-between gap-1.5 sm:gap-1">
          <div className="inline-flex rounded-[13px] border border-border/70 bg-background/60 p-[2px] shadow-sm">
            {timeRangeOptions.map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => setTimeRange(option.key)}
                aria-pressed={timeRange === option.key}
                className={cn(
                  "h-[26px] rounded-[10px] px-1.5 text-[10px] font-semibold transition-all min-w-[2.1rem] sm:min-w-[2.75rem] sm:px-2",
                  timeRange === option.key
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="inline-flex rounded-[13px] border border-border/70 bg-background/60 p-[2px] shadow-sm">
            {chartTypeOptions.map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => setChartType(option.key)}
                aria-pressed={chartType === option.key}
                aria-label={option.label}
                className={cn(
                  "flex h-[26px] w-[26px] items-center justify-center rounded-[10px] transition-all",
                  chartType === option.key
                    ? "bg-chart-1 text-white shadow-sm"
                    : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
                )}
                title={option.label}
              >
                {option.icon}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-1 flex flex-1 min-h-0">
        <div className="flex w-full flex-1 min-h-0 rounded-xl border border-border/60 bg-gradient-to-b from-background/70 via-background/45 to-background/20 p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] sm:p-2">
          {chartData.length === 0 ? (
            <div
              className={cn(
                "flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border/70 bg-muted/15 px-4 text-center text-sm text-muted-foreground",
                emptyStateClass,
              )}
            >
              <BarChart2 className="h-6 w-6 text-chart-1/70" />
              <p className="font-medium text-foreground">{t.noDataYet}</p>
              <p className="max-w-xs text-xs leading-relaxed text-muted-foreground">
                {labels.noRangeData}
              </p>
            </div>
          ) : (
            <ChartContainer
              config={chartConfig}
              className={chartViewportClass}
              dir="ltr"
            >
              {renderChart()}
            </ChartContainer>
          )}
        </div>
      </div>
    </div>
  );
}
