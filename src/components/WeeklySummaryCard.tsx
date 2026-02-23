'use client';

import { useEffect, useState } from 'react';
import {
  RefreshCw,
  Quote,
  Target,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { translations, type Language } from '@/lib/translations';

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

  async function loadSummary(forceRefresh = false) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/weekly-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goalId, forceRefresh }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || errData.message || `HTTP ${res.status}`);
      }

      const json = await res.json();
      setData(json.data);
    } catch (err: any) {
      setError(err?.message || String(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (goalId) loadSummary();
  }, [goalId]);

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
    return (
      <div className="flex items-center justify-between p-3 rounded-xl border border-destructive/20 bg-destructive/5" dir={direction}>
        <p className="text-destructive text-xs font-medium">
          {isArabic ? 'فشل تحميل الملخص' : 'Failed to load'}
        </p>
        <Button variant="ghost" size="sm" onClick={() => loadSummary()} className="h-7 text-xs gap-1.5">
          <RefreshCw className="w-3 h-3" />
          {isArabic ? 'إعادة' : 'Retry'}
        </Button>
      </div>
    );
  }

  if (!data) return null;

  const focusTask = data.next_week_plan?.[0]?.task || null;

  return (
    <div className="space-y-2" dir={direction}>

      {/* ROW 1: Points + Activities + Best Day */}
      <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
        {/* Points */}
        <div className="bg-primary/5 border border-primary/10 rounded-lg sm:rounded-xl px-2 sm:px-3 py-2 sm:py-2.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-0.5">
          <span className="text-[9px] sm:text-[10px] font-bold text-primary uppercase">
            {isArabic ? 'نقاط' : 'Points'}
          </span>
          <span className="text-base sm:text-xl font-black text-foreground">{data.total_points}</span>
        </div>

        {/* Activities */}
        <div className="bg-muted/25 border border-border/30 rounded-lg sm:rounded-xl px-2 sm:px-3 py-2 sm:py-2.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-0.5">
          <span className="text-[9px] sm:text-[10px] font-bold text-muted-foreground uppercase">
            {isArabic ? 'أنشطة' : 'Activities'}
          </span>
          <span className="text-base sm:text-xl font-black text-foreground">{data.completed_count}</span>
        </div>

        {/* Best Day */}
        <div className="bg-muted/25 border border-border/30 rounded-lg sm:rounded-xl px-2 sm:px-3 py-2 sm:py-2.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-0.5">
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

      {/* ROW 2: Coach Message + Focus Task + Refresh */}
      <div className="space-y-1.5 sm:space-y-0 sm:flex sm:items-stretch sm:gap-2">
        {/* Coach message */}
        {data.coach_message && (
          <div className="flex items-center gap-2 px-2.5 sm:px-3 py-2 sm:py-2.5 bg-primary/5 rounded-lg sm:rounded-xl border border-primary/10 min-w-0 sm:flex-1">
            <Quote className="w-3.5 h-3.5 text-primary/40 shrink-0" />
            <p className="text-[11px] sm:text-xs font-medium text-foreground/70 italic line-clamp-2 sm:truncate" title={data.coach_message}>
              {data.coach_message}
            </p>
          </div>
        )}

        <div className="flex items-stretch gap-1.5 sm:gap-2">
          {/* Focus task */}
          {focusTask && (
            <div className="flex items-center gap-2 px-2.5 sm:px-3 py-2 sm:py-2.5 bg-muted/20 rounded-lg sm:rounded-xl border border-border/30 flex-1 sm:flex-none sm:max-w-[40%] min-w-0">
              <Target className="w-3.5 h-3.5 text-primary shrink-0" />
              <span className="text-[11px] sm:text-xs font-semibold text-foreground/70 truncate" title={focusTask}>
                {focusTask}
              </span>
            </div>
          )}

          {/* Refresh */}
          <button
            onClick={() => loadSummary(true)}
            disabled={loading}
            className="shrink-0 px-2.5 py-2 sm:py-2.5 rounded-lg sm:rounded-xl bg-muted/20 border border-border/30 text-muted-foreground/50 hover:text-primary transition-colors"
            title={isArabic ? 'تحديث' : 'Refresh'}
          >
            <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
          </button>
        </div>
      </div>

    </div>
  );
}
