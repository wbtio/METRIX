'use client';

import { useEffect, useState } from 'react';
import {
    CheckCircle2,
    AlertTriangle,
    ArrowUp,
    ArrowDown,
    BarChart2,
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
                    <span>{isArabic ? 'جاري التحليل...' : 'Loading...'}</span>
                </div>
            </div>
        );
    }

    if (!data) return null;

    const formatDate = (date: string | null) => {
        if (!date) return isArabic ? 'غير محدد' : 'TBD';
        return new Date(date).toLocaleDateString(isArabic ? 'ar-EG' : 'en-US', { month: 'short', day: 'numeric' });
    };

    const compUp = data.weekComparison > 0;
    const compZero = data.weekComparison === 0;

    return (
        <div className="space-y-2" dir={isArabic ? 'rtl' : 'ltr'}>

            {/* ROW 1: Status + Velocity + Avg/Log */}
            <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                {/* Status chip */}
                <div className={cn(
                    "flex items-center gap-1.5 px-2 sm:px-3 py-2 sm:py-2.5 rounded-lg sm:rounded-xl border",
                    data.onTrack
                        ? "bg-green-500/5 border-green-500/15 text-green-600 dark:text-green-400"
                        : "bg-orange-500/5 border-orange-500/15 text-orange-600 dark:text-orange-400"
                )}>
                    {data.onTrack
                        ? <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                        : <AlertTriangle className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                    }
                    <span className="text-[10px] sm:text-xs font-bold truncate">
                        {data.onTrack ? (isArabic ? 'على المسار' : 'On Track') : (isArabic ? 'يحتاج جهد' : 'Attention')}
                    </span>
                </div>

                {/* This week velocity */}
                <div className="bg-muted/25 rounded-lg sm:rounded-xl px-2 sm:px-3 py-2 sm:py-2.5 border border-border/30 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-0.5">
                    <span className="text-[9px] sm:text-[10px] font-bold text-muted-foreground uppercase">
                        {isArabic ? 'هذا الأسبوع' : 'This Week'}
                    </span>
                    <div className="flex items-center gap-1">
                        <span className="text-base sm:text-xl font-black text-foreground">{data.currentWeekPoints}</span>
                        {!compZero && (
                            <span className={cn("text-[9px] sm:text-[10px] font-bold flex items-center", compUp ? "text-green-500" : "text-red-500")}>
                                {compUp ? <ArrowUp className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> : <ArrowDown className="w-2.5 h-2.5 sm:w-3 sm:h-3" />}
                                {Math.abs(data.weekComparison).toFixed(0)}%
                            </span>
                        )}
                    </div>
                </div>

                {/* Avg per log */}
                <div className="bg-muted/25 rounded-lg sm:rounded-xl px-2 sm:px-3 py-2 sm:py-2.5 border border-border/30 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-0.5">
                    <span className="text-[9px] sm:text-[10px] font-bold text-muted-foreground uppercase">
                        {isArabic ? 'المعدل' : 'Avg/Log'}
                    </span>
                    <span className="text-base sm:text-xl font-black text-foreground">{data.averagePointsPerLog.toFixed(1)}</span>
                </div>
            </div>

            {/* ROW 2: Active Days + Peak Day + Schedule */}
            <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                {/* Active days */}
                <div className="bg-muted/25 rounded-lg sm:rounded-xl px-2 sm:px-3 py-2 sm:py-2.5 border border-border/30 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-0.5">
                    <span className="text-[9px] sm:text-[10px] font-bold text-muted-foreground uppercase">
                        {isArabic ? 'أيام نشطة' : 'Active'}
                    </span>
                    <span className="text-base sm:text-xl font-black text-foreground">
                        {data.totalActiveDays}<span className="text-xs sm:text-sm font-medium text-muted-foreground">/7</span>
                    </span>
                </div>

                {/* Peak day */}
                <div className="bg-muted/25 rounded-lg sm:rounded-xl px-2 sm:px-3 py-2 sm:py-2.5 border border-border/30 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-0.5">
                    <span className="text-[9px] sm:text-[10px] font-bold text-muted-foreground uppercase">
                        {isArabic ? 'أفضل يوم' : 'Peak'}
                    </span>
                    <span className="text-sm sm:text-base font-black text-foreground truncate">
                        {data.mostProductiveDay
                            ? new Date(data.mostProductiveDay).toLocaleDateString(isArabic ? 'ar-EG' : 'en-US', { weekday: 'short' })
                            : '-'
                        }
                    </span>
                </div>

                {/* Schedule variance */}
                <div className="bg-muted/25 rounded-lg sm:rounded-xl px-2 sm:px-3 py-2 sm:py-2.5 border border-border/30 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-0.5">
                    <span className="text-[9px] sm:text-[10px] font-bold text-muted-foreground uppercase">
                        {isArabic ? 'الجدول' : 'Schedule'}
                    </span>
                    <span className={cn(
                        "text-[10px] sm:text-xs font-bold px-1.5 sm:px-2 py-0.5 rounded-md",
                        data.daysAheadOrBehind >= 0
                            ? "bg-green-500/10 text-green-600 dark:text-green-400"
                            : "bg-red-500/10 text-red-600 dark:text-red-400"
                    )}>
                        {data.daysAheadOrBehind === 0
                            ? (isArabic ? 'بالموعد' : 'On time')
                            : `${Math.abs(data.daysAheadOrBehind)}d ${data.daysAheadOrBehind > 0 ? '▲' : '▼'}`
                        }
                    </span>
                </div>
            </div>

        </div>
    );
}
