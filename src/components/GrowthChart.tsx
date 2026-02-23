'use client';

import { useMemo, useState } from 'react';
import {
    Bar,
    BarChart,
    CartesianGrid,
    XAxis,
    YAxis,
    Line,
    LineChart,
    Area,
    AreaChart,
} from 'recharts';
import { BarChart2, TrendingUp, Layers } from 'lucide-react';
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
    type ChartConfig,
} from '@/components/ui/chart';
import { translations, type Language } from '@/lib/translations';
import { cn } from '@/lib/utils';

type TimeRange = 'week' | 'month' | 'year' | 'all';
type ChartType = 'bar' | 'line' | 'area';

interface GrowthChartProps {
    data: { date: string; points: number }[];
    language?: Language;
    className?: string;
    fillHeight?: boolean;
    embedded?: boolean;
}

const chartConfig = {
    points: {
        label: 'Points',
        color: 'var(--chart-1)',
    },
} satisfies ChartConfig;

export default function GrowthChart({ data, language = 'en', className, fillHeight = false, embedded = false }: GrowthChartProps) {
    const t = translations[language];
    const isArabic = language === 'ar';
    const [timeRange, setTimeRange] = useState<TimeRange>('month');
    const [chartType, setChartType] = useState<ChartType>('bar');

    const filteredData = useMemo(() => {
        if (!data || data.length === 0) return [];

        const now = new Date();
        let cutoffDate: Date;

        switch (timeRange) {
            case 'week':
                cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
            case 'month':
                cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                break;
            case 'year':
                cutoffDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
                break;
            case 'all':
            default:
                cutoffDate = new Date(0);
                break;
        }

        return data.filter(d => new Date(d.date) >= cutoffDate);
    }, [data, timeRange]);

    const chartData = useMemo(() => {
        if (filteredData.length === 0) return [];

        const gregorianDayLabel = new Intl.DateTimeFormat('en-US', {
            calendar: 'gregory',
            month: 'short',
            day: 'numeric',
        });

        const gregorianWeekLabel = new Intl.DateTimeFormat('en-US', {
            calendar: 'gregory',
            weekday: 'short',
            month: 'short',
            day: 'numeric',
        });

        // Group by day and sum points.
        const dailyPoints = filteredData.reduce((acc, curr) => {
            const dateObj = new Date(curr.date);
            const dayKey = `${dateObj.getFullYear()}-${dateObj.getMonth()}-${dateObj.getDate()}`;

            if (!acc[dayKey]) {
                acc[dayKey] = {
                    date: curr.date,
                    points: 0,
                };
            }

            acc[dayKey].points += curr.points;
            return acc;
        }, {} as Record<string, { date: string; points: number }>);

        // Convert to array and sort by date
        return Object.values(dailyPoints)
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
            .map(d => {
                const dateObj = new Date(d.date);
                const formattedDate = timeRange === 'week'
                    ? gregorianWeekLabel.format(dateObj)
                    : gregorianDayLabel.format(dateObj);

                return {
                    date: formattedDate,
                    points: d.points,
                    fullDate: d.date,
                };
            });
    }, [filteredData, timeRange]);

    const containerClass = cn(
        embedded
            ? "p-0 rounded-none border-0 shadow-none bg-transparent hover:bg-transparent ring-0"
            : "bg-card/30 backdrop-blur-xl p-4 rounded-[24px] shadow-2xl border border-border relative overflow-hidden ring-1 ring-border/5 hover:bg-card/40 transition-all",
        fillHeight && "flex flex-col h-full",
        className
    );

    const timeRangeOptions: { key: TimeRange; label: string }[] = [
        { key: 'week', label: t.thisWeek },
        { key: 'month', label: t.thisMonth },
        { key: 'year', label: t.thisYear },
        { key: 'all', label: t.allTime },
    ];

    const chartTypeOptions: { key: ChartType; label: string; icon: React.ReactNode }[] = [
        { key: 'bar', label: t.barChart, icon: <BarChart2 className="w-3.5 h-3.5" /> },
        { key: 'line', label: t.lineChart, icon: <TrendingUp className="w-3.5 h-3.5" /> },
        { key: 'area', label: t.areaChart, icon: <Layers className="w-3.5 h-3.5" /> },
    ];

    if (chartData.length === 0) {
        return (
            <div className={containerClass}>
                {/* Header */}
                <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between" dir={isArabic ? 'rtl' : 'ltr'}>
                    <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                        <BarChart2 className="w-4 h-4 text-chart-1" />
                        {t.growthTrajectory}
                    </h3>
                    <div className="max-w-full overflow-x-auto">
                        <div className="flex items-center bg-muted/40 rounded-lg p-0.5 gap-0.5 w-max">
                            {timeRangeOptions.map(opt => (
                                <button
                                    key={opt.key}
                                    onClick={() => setTimeRange(opt.key)}
                                    className={cn(
                                        "px-2 py-1 rounded-md text-[10px] font-bold transition-all whitespace-nowrap",
                                        timeRange === opt.key
                                            ? "bg-primary text-primary-foreground shadow-sm"
                                            : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                                    )}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className={cn(
                    "flex items-center justify-center bg-muted/20 rounded-xl border border-dashed border-border text-muted-foreground text-sm font-medium",
                    fillHeight ? "flex-1 min-h-[160px]" : "h-36"
                )}>
                    {t.noDataYet}
                </div>
            </div>
        );
    }

    // Shared chart props
    const sharedAxisProps = {
        xAxis: {
            dataKey: "date" as const,
            tickLine: false,
            axisLine: false,
            tickMargin: 10,
            minTickGap: 0,
            interval: 0 as const,
            height: 54,
            angle: -30,
            textAnchor: 'end' as const,
            className: "text-xs fill-muted-foreground",
        },
    };

    const renderChart = () => {
        switch (chartType) {
            case 'line':
                return (
                    <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border" />
                        <XAxis {...sharedAxisProps.xAxis} />
                        <YAxis hide />
                        <ChartTooltip
                            cursor={{ stroke: 'var(--muted)', strokeWidth: 1 }}
                            content={
                                <ChartTooltipContent
                                    indicator="line"
                                    labelFormatter={(value) => `${value}`}
                                />
                            }
                        />
                        <Line
                            dataKey="points"
                            type="monotone"
                            stroke="var(--color-points)"
                            strokeWidth={3}
                            dot={{ fill: 'var(--color-points)', r: 4, strokeWidth: 2, stroke: 'var(--background)' }}
                            activeDot={{ r: 6, strokeWidth: 2, stroke: 'var(--background)' }}
                        />
                    </LineChart>
                );
            case 'area':
                return (
                    <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                            <linearGradient id="growthGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="var(--color-points)" stopOpacity={0.4} />
                                <stop offset="95%" stopColor="var(--color-points)" stopOpacity={0.05} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border" />
                        <XAxis {...sharedAxisProps.xAxis} />
                        <YAxis hide />
                        <ChartTooltip
                            cursor={{ stroke: 'var(--muted)', strokeWidth: 1 }}
                            content={
                                <ChartTooltipContent
                                    indicator="line"
                                    labelFormatter={(value) => `${value}`}
                                />
                            }
                        />
                        <Area
                            dataKey="points"
                            type="monotone"
                            stroke="var(--color-points)"
                            strokeWidth={2.5}
                            fill="url(#growthGradient)"
                            dot={{ fill: 'var(--color-points)', r: 3, strokeWidth: 2, stroke: 'var(--background)' }}
                            activeDot={{ r: 5, strokeWidth: 2, stroke: 'var(--background)' }}
                        />
                    </AreaChart>
                );
            case 'bar':
            default:
                return (
                    <BarChart data={chartData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                        <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border" />
                        <XAxis {...sharedAxisProps.xAxis} />
                        <YAxis hide />
                        <ChartTooltip
                            cursor={{ fill: 'var(--muted)', opacity: 0.3 }}
                            content={
                                <ChartTooltipContent
                                    indicator="dashed"
                                    labelFormatter={(value) => `${value}`}
                                />
                            }
                        />
                        <Bar
                            dataKey="points"
                            fill="var(--color-points)"
                            radius={[4, 4, 0, 0]}
                            maxBarSize={50}
                        />
                    </BarChart>
                );
        }
    };

    return (
        <div className={containerClass}>
            {/* Compact Header (Title + Avg + Controls) */}
            <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between" dir={isArabic ? 'rtl' : 'ltr'}>
                <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                    <BarChart2 className="w-4 h-4 text-chart-1" />
                    {t.growthTrajectory}
                </h3>

                <div className="flex flex-wrap items-center gap-1.5">
                    {/* Time Range Selector */}
                    <div className="flex items-center bg-muted/40 rounded-lg p-0.5 gap-0.5 w-max">
                        {timeRangeOptions.map(opt => (
                            <button
                                key={opt.key}
                                onClick={() => setTimeRange(opt.key)}
                                className={cn(
                                    "px-2 py-1 rounded-md text-[10px] font-bold transition-all whitespace-nowrap",
                                    timeRange === opt.key
                                        ? "bg-primary text-primary-foreground shadow-sm"
                                        : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                                )}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>

                    {/* Chart Type Selector */}
                    <div className="flex items-center bg-muted/40 rounded-lg p-0.5 gap-0.5 w-max">
                        {chartTypeOptions.map(opt => (
                            <button
                                key={opt.key}
                                onClick={() => setChartType(opt.key)}
                                className={cn(
                                    "flex items-center gap-1 px-1.5 py-1 rounded-md text-[10px] font-bold transition-all whitespace-nowrap",
                                    chartType === opt.key
                                        ? "bg-chart-1 text-white shadow-sm"
                                        : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                                )}
                                title={opt.label}
                            >
                                {opt.icon}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Chart - reduced height */}
            <ChartContainer
                config={chartConfig}
                className={cn(fillHeight ? "flex-1 min-h-[150px] sm:min-h-[180px] w-full" : "h-[180px] sm:h-[220px] w-full")}
                dir="ltr"
            >
                {renderChart()}
            </ChartContainer>
        </div>
    );
}
