'use client';

import { useEffect, useState } from 'react';
import {
    CheckCircle2,
    AlertTriangle,
    ArrowUp,
    ArrowDown,
    BarChart2,
    CalendarCheck,
    Zap,
    TrendingUp,
    Activity,
} from 'lucide-react';
import { translations, type Language } from '@/lib/translations';
import { cn } from '@/lib/utils';

interface AnalyticsData {
    currentWeekPoints: number;
    lastWeekPoints: number;
    weekComparison: number;
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
    const isArabic = language === 'ar';
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchAnalytics() {
            try {
                const res = await fetch('/api/analytics', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ goalId }),
                });
                const json = await res.json().catch(() => null);
                if (!res.ok) {
                    throw new Error(json?.error || json?.message || `HTTP ${res.status}`);
                }
                if (json.data) setData(json.data);
            } catch {
                // Keep analytics panel calm when API is unavailable.
            } finally {
                setLoading(false);
            }
        }
        fetchAnalytics();
    }, [goalId]);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-8" dir={isArabic ? 'rtl' : 'ltr'}>
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                    <BarChart2 className="w-4 h-4 animate-pulse" />
                    <span>{isArabic ? '\u062c\u0627\u0631\u064a \u0627\u0644\u062a\u062d\u0644\u064a\u0644...' : 'Loading...'}</span>
                </div>
            </div>
        );
    }

    if (!data) return null;

    const formatDate = (date: string | null) => {
        if (!date) return isArabic ? '\u063a\u064a\u0631 \u0645\u062d\u062f\u062f' : 'TBD';
        return new Date(date).toLocaleDateString(isArabic ? 'ar-EG' : 'en-US', { month: 'short', day: 'numeric' });
    };

    const compUp = data.weekComparison > 0;
    const compZero = data.weekComparison === 0;

    // Active days progress for visual bar
    const activeDaysPct = Math.round((data.totalActiveDays / 7) * 100);

    return (
        <div className="space-y-3" dir={isArabic ? 'rtl' : 'ltr'}>

            {/* ROW 1: Status Banner */}
            <div className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl border",
                data.onTrack
                    ? "bg-green-500/5 border-green-500/20"
                    : "bg-orange-500/5 border-orange-500/20"
            )}>
                <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                    data.onTrack
                        ? "bg-green-500/10 text-green-600 dark:text-green-400"
                        : "bg-orange-500/10 text-orange-600 dark:text-orange-400"
                )}>
                    {data.onTrack ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                </div>
                <div className="flex-1 min-w-0">
                    <span className={cn(
                        "text-sm font-black",
                        data.onTrack ? "text-green-700 dark:text-green-400" : "text-orange-700 dark:text-orange-400"
                    )}>
                        {data.onTrack ? (isArabic ? '\u0639\u0644\u0649 \u0627\u0644\u0645\u0633\u0627\u0631' : 'On Track') : (isArabic ? '\u064a\u062d\u062a\u0627\u062c \u062c\u0647\u062f' : 'Needs Attention')}
                    </span>
                    <p className="text-[11px] text-muted-foreground">
                        {data.daysAheadOrBehind === 0
                            ? (isArabic ? '\u0628\u0627\u0644\u0645\u0648\u0639\u062f \u062a\u0645\u0627\u0645\u0627\u064b' : 'Exactly on time')
                            : `${Math.abs(data.daysAheadOrBehind)} ${isArabic ? '\u064a\u0648\u0645' : 'days'} ${data.daysAheadOrBehind > 0 ? (isArabic ? '\u0645\u062a\u0642\u062f\u0645' : 'ahead') : (isArabic ? '\u0645\u062a\u0623\u062e\u0631' : 'behind')}`
                        }
                    </p>
                </div>
            </div>

            {/* ROW 2: Key Metrics Grid */}
            <div className="grid grid-cols-3 gap-2">
                {/* This week points */}
                <div className="bg-white dark:bg-card/40 rounded-xl px-3 py-3 border border-border/50 flex flex-col justify-center">
                    <div className="flex items-center gap-1.5 mb-1.5">
                        <Zap className="w-3 h-3 text-primary" />
                        <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">
                            {isArabic ? '\u0647\u0630\u0627 \u0627\u0644\u0623\u0633\u0628\u0648\u0639' : 'This Week'}
                        </span>
                    </div>
                    <div className="flex items-end gap-1.5">
                        <span className="text-xl sm:text-2xl font-black text-foreground leading-none">{data.currentWeekPoints}</span>
                        {!compZero && (
                            <span className={cn("text-[10px] font-bold flex items-center mb-0.5", compUp ? "text-green-500" : "text-red-500")}>
                                {compUp ? <ArrowUp className="w-2.5 h-2.5" /> : <ArrowDown className="w-2.5 h-2.5" />}
                                {Math.abs(data.weekComparison).toFixed(0)}%
                            </span>
                        )}
                    </div>
                </div>

                {/* Avg per log */}
                <div className="bg-white dark:bg-card/40 rounded-xl px-3 py-3 border border-border/50 flex flex-col justify-center">
                    <div className="flex items-center gap-1.5 mb-1.5">
                        <TrendingUp className="w-3 h-3 text-primary" />
                        <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">
                            {isArabic ? '\u0627\u0644\u0645\u0639\u062f\u0644' : 'Avg/Task'}
                        </span>
                    </div>
                    <div className="flex items-end gap-1">
                        <span className="text-xl sm:text-2xl font-black text-foreground leading-none">{data.averagePointsPerLog.toFixed(1)}</span>
                        <span className="text-[9px] font-bold text-muted-foreground mb-0.5">XP</span>
                    </div>
                </div>

                {/* Peak day */}
                <div className="bg-white dark:bg-card/40 rounded-xl px-3 py-3 border border-border/50 flex flex-col justify-center">
                    <div className="flex items-center gap-1.5 mb-1.5">
                        <CalendarCheck className="w-3 h-3 text-primary" />
                        <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">
                            {isArabic ? '\u0623\u0641\u0636\u0644 \u064a\u0648\u0645' : 'Peak Day'}
                        </span>
                    </div>
                    <span className="text-base sm:text-lg font-black text-foreground truncate leading-none">
                        {data.mostProductiveDay
                            ? new Date(data.mostProductiveDay).toLocaleDateString(isArabic ? 'ar-EG' : 'en-US', { weekday: 'short' })
                            : '-'
                        }
                    </span>
                </div>
            </div>

            {/* ROW 3: Active Days Visual Bar */}
            <div className="bg-white dark:bg-card/40 rounded-xl px-4 py-3 border border-border/50">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                        <Activity className="w-3.5 h-3.5 text-primary" />
                        <span className="text-xs font-bold text-foreground">
                            {isArabic ? '\u0623\u064a\u0627\u0645 \u0646\u0634\u0637\u0629' : 'Active Days'}
                        </span>
                    </div>
                    <span className="text-sm font-black text-foreground">
                        {data.totalActiveDays}<span className="text-xs font-medium text-muted-foreground">/7</span>
                    </span>
                </div>
                <div className="h-2 w-full bg-muted/40 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-primary rounded-full transition-all duration-700"
                        style={{ width: `${activeDaysPct}%` }}
                    />
                </div>
            </div>

            {/* ROW 4: Projected Completion */}
            <div className="bg-gradient-to-r from-primary/8 via-primary/4 to-transparent rounded-xl px-4 py-3.5 border border-primary/15 flex items-center justify-between gap-3">
                <div className="min-w-0">
                    <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5 mb-0.5">
                        <BarChart2 className="w-3.5 h-3.5 text-primary" />
                        {isArabic ? '\u062a\u0648\u0642\u0639 \u0627\u0644\u0625\u0646\u062c\u0627\u0632' : 'Projected Completion'}
                    </h4>
                    <p className="text-[11px] text-muted-foreground leading-snug">
                        {isArabic ? '\u0628\u0646\u0627\u0621\u064b \u0639\u0644\u0649 \u0633\u0631\u0639\u062a\u0643 \u0627\u0644\u062d\u0627\u0644\u064a\u0629' : 'Based on your current pace'}
                    </p>
                </div>
                <div className="bg-background/80 backdrop-blur-sm px-3.5 py-2 rounded-lg border border-border/50 text-center shrink-0 shadow-sm">
                    <span className="block text-base font-black text-primary">
                        {formatDate(data.projectedCompletionDate)}
                    </span>
                </div>
            </div>

        </div>
    );
}
