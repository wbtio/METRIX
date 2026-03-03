'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  RefreshCw,
  Quote,
  Target,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { type Language } from '@/lib/translations';

interface WeeklySummary {
  completed_count: number;
  total_points: number;
  best_day: string | null;
  best_activity: string | null;
  patterns: string[];
  improvements: string[];
  next_week_plan: { task: string; frequency: string }[];
  coach_message: string;
}

interface WeeklySummaryCardProps {
  goalId: string;
  language?: Language;
}

export default function WeeklySummaryCard({ goalId, language = 'en' }: WeeklySummaryCardProps) {
  const direction = language === 'ar' ? 'rtl' : 'ltr';
  const isArabic = language === 'ar';

  const [data, setData] = useState<WeeklySummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getErrorMessage = (err: unknown): string => {
    if (err instanceof Error) return err.message;
    return String(err);
  };

  const loadSummary = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/weekly-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goalId, forceRefresh }),
      });

      const payload = await res.json().catch(() => null);

      if (!res.ok) {
        if (
          res.status === 400
          && (payload?.code === 'INSUFFICIENT_DAYS' || payload?.error?.includes('7 days'))
        ) {
          setError('INSUFFICIENT_DAYS');
          return;
        }
        throw new Error(payload?.error || payload?.message || `HTTP ${res.status}`);
      }

      setData(payload?.data ?? null);
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [goalId]);

  useEffect(() => {
    if (goalId) loadSummary();
  }, [goalId, loadSummary]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8" dir={direction}>
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <RefreshCw className="w-4 h-4 animate-spin" />
          <span>{isArabic ? 'جاري التحليل...' : 'Loading...'}</span>
        </div>
      </div>
    );
  }

  if (error) {
    if (error === 'INSUFFICIENT_DAYS') {
      return (
        <div className="flex flex-col items-center justify-center p-6 text-center space-y-3" dir={direction}>
          <div className="w-12 h-12 bg-muted/50 rounded-full flex items-center justify-center mb-2">
            <Target className="w-6 h-6 text-muted-foreground/60" />
          </div>
          <h4 className="text-sm font-bold text-foreground">
            {isArabic ? 'بيانات غير كافية' : 'Not enough data'}
          </h4>
          <p className="text-xs text-muted-foreground max-w-[250px] leading-relaxed">
            {isArabic 
              ? 'يجب تسجيل النشاطات لمدة 7 أيام على الأقل لإنشاء ملخص الأسبوع.' 
              : 'You need at least 7 days of logs to generate a weekly summary.'}
          </p>
        </div>
      );
    }

    return (
      <div className="flex items-center justify-between p-3 rounded-xl border border-destructive/20 bg-destructive/5" dir={direction}>
        <p className="text-destructive text-xs font-medium">
          {isArabic ? 'فشل تحميل الملخص' : 'Failed to load summary'}
        </p>
        <Button variant="ghost" size="sm" onClick={() => loadSummary()} className="h-7 text-xs gap-1.5 hover:bg-destructive/10">
          <RefreshCw className="w-3 h-3" />
          {isArabic ? 'إعادة المحاولة' : 'Retry'}
        </Button>
      </div>
    );
  }

  if (!data) return null;

  // Empty state handling
  if (data.completed_count === 0 && data.total_points === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-6 text-center space-y-3" dir={direction}>
        <div className="w-12 h-12 bg-muted/50 rounded-full flex items-center justify-center mb-2">
          <Target className="w-6 h-6 text-muted-foreground/60" />
        </div>
        <h4 className="text-sm font-bold text-foreground">
          {isArabic ? 'لا توجد بيانات كافية للملخص' : 'Not enough data for summary'}
        </h4>
        <p className="text-xs text-muted-foreground max-w-[250px] leading-relaxed">
          {isArabic 
            ? 'قم بتسجيل نشاطك اليومي لمدة أسبوع على الأقل ليتمكن الذكاء الاصطناعي من تحليل أدائك وتقديم نصائح مخصصة.' 
            : 'Log your daily progress for at least a week so the AI can analyze your performance and provide personalized tips.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3" dir={direction}>

      {/* ROW 1: Points + Activities + Best Day */}
      <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
        {/* Points */}
        <div className="bg-primary/8 border border-primary/20 rounded-lg sm:rounded-xl px-2 sm:px-3 py-2 sm:py-2.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-0.5">
          <span className="text-[9px] sm:text-[10px] font-bold text-primary uppercase">
            {isArabic ? 'نقاط' : 'Points'}
          </span>
          <span className="text-base sm:text-xl font-black text-foreground">{data.total_points}</span>
        </div>

        {/* Activities */}
        <div className="bg-white dark:bg-muted/25 border border-border/60 rounded-lg sm:rounded-xl px-2 sm:px-3 py-2 sm:py-2.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-0.5">
          <span className="text-[9px] sm:text-[10px] font-bold text-muted-foreground uppercase">
            {isArabic ? 'أنشطة' : 'Activities'}
          </span>
          <span className="text-base sm:text-xl font-black text-foreground">{data.completed_count}</span>
        </div>

        {/* Best Day */}
        <div className="bg-white dark:bg-muted/25 border border-border/60 rounded-lg sm:rounded-xl px-2 sm:px-3 py-2 sm:py-2.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-0.5">
          <span className="text-[9px] sm:text-[10px] font-bold text-muted-foreground uppercase">
            {isArabic ? 'أفضل يوم' : 'Best Day'}
          </span>
          <span className="text-sm sm:text-base font-black text-foreground">
            {data.best_day
              ? new Date(data.best_day).toLocaleDateString(isArabic ? 'ar-EG' : 'en-US', { weekday: 'short' })
              : '-'}
          </span>
        </div>
      </div>

      {/* ROW 2: Best Activity */}
      {data.best_activity && (
        <div className="bg-white dark:bg-card/40 border border-border/70 rounded-xl p-3 sm:p-4">
          <h4 className="text-[10px] sm:text-xs font-bold text-muted-foreground uppercase mb-1">
            {isArabic ? 'أفضل نشاط هذا الأسبوع' : 'Best Activity'}
          </h4>
          <p className="text-sm font-semibold text-foreground leading-snug">
            {data.best_activity}
          </p>
        </div>
      )}

      {/* ROW 3: Patterns & Improvements Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
        {data.patterns && data.patterns.length > 0 && (
          <div className="bg-blue-500/8 border border-blue-500/20 rounded-xl p-3 sm:p-4">
            <h4 className="text-xs font-bold text-blue-600 dark:text-blue-400 mb-2 flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5" />
              {isArabic ? 'ملاحظات الأداء' : 'Observations'}
            </h4>
            <ul className="space-y-1.5">
              {data.patterns.map((pattern, idx) => (
                <li key={idx} className="text-[11px] sm:text-xs text-foreground/80 flex items-start gap-1.5">
                  <span className="text-blue-500 mt-0.5 text-[10px]">●</span>
                  <span className="leading-relaxed">{pattern}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {data.improvements && data.improvements.length > 0 && (
          <div className="bg-orange-500/8 border border-orange-500/20 rounded-xl p-3 sm:p-4">
            <h4 className="text-xs font-bold text-orange-600 dark:text-orange-400 mb-2 flex items-center gap-1.5">
              <RefreshCw className="w-3.5 h-3.5" />
              {isArabic ? 'فرص التحسين' : 'Improvements'}
            </h4>
            <ul className="space-y-1.5">
              {data.improvements.map((improvement, idx) => (
                <li key={idx} className="text-[11px] sm:text-xs text-foreground/80 flex items-start gap-1.5">
                  <span className="text-orange-500 mt-0.5 text-[10px]">●</span>
                  <span className="leading-relaxed">{improvement}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* ROW 4: Coach Message + Refresh */}
      <div className="flex items-stretch gap-2">
        {/* Coach message */}
        <div className="flex items-center gap-2 px-3 py-2.5 sm:py-3 bg-primary/12 rounded-xl border border-primary/25 flex-1 min-w-0">
          <Quote className="w-4 h-4 text-primary shrink-0" />
          <p className="text-xs sm:text-sm font-semibold text-primary leading-snug">
            {data.coach_message || (isArabic ? 'استمر في التقدم!' : 'Keep pushing forward!')}
          </p>
        </div>

        {/* Refresh */}
        <button
          onClick={() => loadSummary(true)}
          disabled={loading}
          className="shrink-0 px-3 py-2.5 sm:py-3 rounded-xl bg-white dark:bg-muted/20 border border-border/60 text-muted-foreground hover:text-primary transition-colors hover:bg-muted/30"
          title={isArabic ? 'تحديث الملخص' : 'Refresh Summary'}
        >
          <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
        </button>
      </div>

    </div>
  );
}
