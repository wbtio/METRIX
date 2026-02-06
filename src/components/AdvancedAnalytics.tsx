'use client';

import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, Calendar, Target, Zap, BarChart3, ChevronDown, ChevronUp } from 'lucide-react';
import { translations, type Language } from '@/lib/translations';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

interface AnalyticsData {
    currentWeekPoints: number;
    lastWeekPoints: number;
    weekComparison: number; // percentage change
    averagePointsPerLog: number;
    totalActiveDays: number;
    mostProductiveDay: string | null;
    bestTimeOfDay: string | null;
    projectedCompletionDate: string | null;
    onTrack: boolean;
    daysAheadOrBehind: number;
}

interface AdvancedAnalyticsProps {
    goalId: string;
    language?: Language;
}

export default function AdvancedAnalytics({ goalId, language = 'en' }: AdvancedAnalyticsProps) {
    const t = translations[language];
    const isArabic = language === 'ar';
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        fetchAnalytics();
    }, [goalId]);

    const fetchAnalytics = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/analytics', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ goalId }),
            });
            const result = await res.json();
            setData(result.data);
        } catch (error) {
            console.error('Failed to fetch analytics:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="bg-card/30 backdrop-blur-xl p-4 rounded-2xl border border-border animate-pulse">
                <div className="h-16 bg-muted/20 rounded-xl"></div>
            </div>
        );
    }

    if (!data) return null;

    const weekChange = data.weekComparison;
    const isPositive = weekChange >= 0;

    return (
        <div className="bg-card/30 backdrop-blur-xl rounded-2xl border border-border shadow-lg overflow-hidden" dir={isArabic ? 'rtl' : 'ltr'}>
            <Collapsible open={isOpen} onOpenChange={setIsOpen}>
                {/* Compact Header */}
                <div className={cn("px-4 py-3 border-b border-border/40 bg-card/20 transition-all", isOpen && "pb-3")}>
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 flex-1 min-w-0">
                            <div className="shrink-0 w-8 h-8 bg-chart-1/10 rounded-xl flex items-center justify-center border border-chart-1/20">
                                <BarChart3 className="w-4 h-4 text-chart-1" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="text-sm font-bold text-foreground">
                                    {isArabic ? 'تحليلات متقدمة' : 'Advanced Analytics'}
                                </h3>
                                {!isOpen && (
                                    <div className="flex items-center gap-2 text-xs">
                                        <span className={cn("font-medium", isPositive ? "text-chart-2" : "text-destructive")}>
                                            {isPositive ? '+' : ''}{weekChange.toFixed(0)}%
                                        </span>
                                        <span className="text-muted-foreground">
                                            {isArabic ? 'هذا الأسبوع' : 'this week'}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                        <CollapsibleTrigger asChild>
                            <button className="shrink-0 p-1.5 hover:bg-muted rounded-lg transition-colors">
                                {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                        </CollapsibleTrigger>
                    </div>
                </div>

                <CollapsibleContent>
                    <div className="p-4 space-y-4">
                        {/* Week Comparison */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-muted/30 p-3 rounded-xl border border-border">
                                <div className="flex items-center gap-2 mb-1.5">
                                    <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                                    <span className="text-[10px] font-bold text-muted-foreground uppercase">
                                        {isArabic ? 'هذا الأسبوع' : 'This Week'}
                                    </span>
                                </div>
                                <p className="text-xl font-black text-foreground">{data.currentWeekPoints}</p>
                                <div className="flex items-center gap-1 mt-1">
                                    {isPositive ? (
                                        <TrendingUp className="w-3 h-3 text-chart-2" />
                                    ) : (
                                        <TrendingDown className="w-3 h-3 text-destructive" />
                                    )}
                                    <span className={cn("text-xs font-bold", isPositive ? "text-chart-2" : "text-destructive")}>
                                        {isPositive ? '+' : ''}{weekChange.toFixed(0)}%
                                    </span>
                                </div>
                            </div>

                            <div className="bg-muted/20 p-3 rounded-xl border border-border">
                                <div className="flex items-center gap-2 mb-1.5">
                                    <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                                    <span className="text-[10px] font-bold text-muted-foreground uppercase">
                                        {isArabic ? 'الأسبوع الماضي' : 'Last Week'}
                                    </span>
                                </div>
                                <p className="text-xl font-black text-muted-foreground">{data.lastWeekPoints}</p>
                            </div>
                        </div>

                        {/* Quick Stats */}
                        <div className="grid grid-cols-3 gap-2">
                            <StatItem
                                icon={<Zap className="w-3 h-3" />}
                                label={isArabic ? 'متوسط/تسجيل' : 'Avg/Log'}
                                value={data.averagePointsPerLog.toFixed(1)}
                                color="text-chart-5"
                            />
                            <StatItem
                                icon={<Calendar className="w-3 h-3" />}
                                label={isArabic ? 'أيام نشطة' : 'Active Days'}
                                value={data.totalActiveDays}
                                color="text-chart-3"
                            />
                            <StatItem
                                icon={<Target className="w-3 h-3" />}
                                label={isArabic ? 'الحالة' : 'Status'}
                                value={data.onTrack ? (isArabic ? 'متقدم' : 'On Track') : (isArabic ? 'متأخر' : 'Behind')}
                                color={data.onTrack ? "text-chart-2" : "text-destructive"}
                            />
                        </div>

                        {/* Insights */}
                        <div className="space-y-2">
                            {data.mostProductiveDay && (
                                <InsightRow
                                    label={isArabic ? 'أفضل يوم' : 'Most Productive'}
                                    value={new Date(data.mostProductiveDay).toLocaleDateString('en-US', { weekday: 'long' })}
                                />
                            )}
                            {data.projectedCompletionDate && (
                                <InsightRow
                                    label={isArabic ? 'التوقع' : 'Projected End'}
                                    value={new Date(data.projectedCompletionDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                />
                            )}
                            {data.daysAheadOrBehind !== 0 && (
                                <InsightRow
                                    label={isArabic ? 'الفرق' : 'Difference'}
                                    value={`${Math.abs(data.daysAheadOrBehind)} ${isArabic ? 'يوم' : 'days'} ${data.daysAheadOrBehind > 0 ? (isArabic ? 'متقدم' : 'ahead') : (isArabic ? 'متأخر' : 'behind')}`}
                                    highlight={data.daysAheadOrBehind > 0}
                                />
                            )}
                        </div>
                    </div>
                </CollapsibleContent>
            </Collapsible>
        </div>
    );
}

function StatItem({ icon, label, value, color }: { icon: any; label: string; value: string | number; color: string }) {
    return (
        <div className="bg-muted/20 p-2 rounded-lg border border-border text-center">
            <div className={cn("flex items-center justify-center gap-1 mb-0.5", color)}>
                {icon}
                <span className="text-[9px] font-bold uppercase opacity-80">{label}</span>
            </div>
            <p className={cn("text-sm font-bold", color)}>{value}</p>
        </div>
    );
}

function InsightRow({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
    return (
        <div className="flex items-center justify-between text-xs py-1.5 px-2 bg-muted/20 rounded-lg">
            <span className="text-muted-foreground font-medium">{label}</span>
            <span className={cn("font-bold", highlight ? "text-chart-2" : "text-foreground")}>{value}</span>
        </div>
    );
}
