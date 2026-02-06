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
}

const chartConfig = {
    points: {
        label: 'Points',
        color: 'var(--chart-1)',
    },
} satisfies ChartConfig;

export default function GrowthChart({ data, language = 'en', className, fillHeight = false }: GrowthChartProps) {
    const t = translations[language];
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

        // Group by date and sum points
        const dailyPoints = filteredData.reduce((acc, curr) => {
            const dateStr = new Date(curr.date).toLocaleDateString('en-US');
            if (!acc[dateStr]) {
                acc[dateStr] = {
                    date: curr.date,
                    points: 0,
                };
            }
            acc[dateStr].points += curr.points;
            return acc;
        }, {} as Record<string, { date: string; points: number }>);

        // Convert to array and sort by date
        return Object.values(dailyPoints)
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
            .map(d => {
                const dateObj = new Date(d.date);
                let formattedDate: string;

                if (timeRange === 'year') {
                    formattedDate = dateObj.toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', { month: 'short', day: 'numeric' });
                } else if (timeRange === 'week') {
                    formattedDate = dateObj.toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', { weekday: 'short', day: 'numeric' });
                } else {
                    formattedDate = dateObj.toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', { month: 'short', day: 'numeric' });
                }

                return {
                    date: formattedDate,
                    points: d.points,
                    fullDate: d.date,
                };
            });
    }, [filteredData, timeRange, language]);

    const containerClass = cn(
        "bg-card/30 backdrop-blur-xl p-6 rounded-[32px] shadow-2xl border border-border relative overflow-hidden ring-1 ring-border/5 hover:bg-card/40 transition-all",
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
                <div className="mb-4">
                    <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
                        <BarChart2 className="w-5 h-5 text-chart-1" />
                        {t.growthTrajectory}
                    </h3>
                </div>

                {/* Controls even when empty */}
                <div className="flex flex-wrap items-center gap-2 mb-4">
                    <div className="flex items-center bg-muted/40 rounded-xl p-1 gap-0.5">
                        {timeRangeOptions.map(opt => (
                            <button
                                key={opt.key}
                                onClick={() => setTimeRange(opt.key)}
                                className={cn(
                                    "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
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

                <div className={cn(
                    "flex items-center justify-center bg-muted/20 rounded-2xl border border-dashed border-border text-muted-foreground text-sm font-medium",
                    fillHeight ? "flex-1 min-h-[220px]" : "h-48"
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
            minTickGap: 32,
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

    // Calculate summary stats for the selected range
    const totalPointsInRange = chartData.reduce((sum, d) => sum + d.points, 0);
    const avgPointsPerDay = chartData.length > 0 ? Math.round(totalPointsInRange / chartData.length) : 0;

    return (
        <div className={containerClass}>
            {/* Unified Header (Title + Controls) */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-3">
                    <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
                        <BarChart2 className="w-5 h-5 text-chart-1" />
                        {t.growthTrajectory}
                    </h3>

                    {/* Avg/Day Stat */}
                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-chart-1/10 rounded-full border border-chart-1/20">
                        <span className="text-[10px] font-bold text-chart-1 uppercase">{language === 'ar' ? 'المعدل' : 'Avg'}:</span>
                        <span className="text-xs font-black text-chart-1 tabular-nums">{avgPointsPerDay}</span>
                    </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                    {/* Time Range Selector */}
                    <div className="flex items-center bg-muted/40 rounded-xl p-1 gap-0.5">
                        {timeRangeOptions.map(opt => (
                            <button
                                key={opt.key}
                                onClick={() => setTimeRange(opt.key)}
                                className={cn(
                                    "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
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
                    <div className="flex items-center bg-muted/40 rounded-xl p-1 gap-0.5">
                        {chartTypeOptions.map(opt => (
                            <button
                                key={opt.key}
                                onClick={() => setChartType(opt.key)}
                                className={cn(
                                    "flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-bold transition-all",
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

            {/* Chart */}
            <ChartContainer config={chartConfig} className={cn(fillHeight ? "flex-1 min-h-[260px] w-full" : "h-[300px] w-full")}>
                {renderChart()}
            </ChartContainer>
        </div>
    );
}
