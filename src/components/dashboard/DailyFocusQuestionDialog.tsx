'use client';

import { Brain, Loader2, Send } from 'lucide-react';
import { translations, type Language } from '@/lib/translations';
import type { DailyFocusSession } from '@/lib/daily-focus';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface DailyFocusQuestionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  language?: Language;
  isArabic: boolean;
  dailyFocus: DailyFocusSession | null;
  loading: boolean;
  submitting: boolean;
  answer: string;
  onAnswerChange: (value: string) => void;
  onSubmit: () => void;
}

export default function DailyFocusQuestionDialog({
  open,
  onOpenChange,
  language = 'en',
  isArabic,
  dailyFocus,
  loading,
  submitting,
  answer,
  onAnswerChange,
  onSubmit,
}: DailyFocusQuestionDialogProps) {
  const t = translations[language];
  const submitDisabled = submitting || loading || !answer.trim();
  const currentQuestionNumber = Math.max(
    1,
    (dailyFocus?.answered_days_count || 0) + (dailyFocus?.answered_at ? 0 : 1),
  );
  const cycleTotal = Math.max(1, dailyFocus?.required_answer_days || 5);
  const cycleStep = Math.min(currentQuestionNumber, cycleTotal);
  const cycleLabel = isArabic
    ? `${cycleStep} من ${cycleTotal}`
    : `${cycleStep} of ${cycleTotal}`;
  const questionLabel = isArabic
    ? `السؤال ${currentQuestionNumber}`
    : `Question ${currentQuestionNumber}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="left-1/2 top-auto bottom-2 w-[calc(100vw-1rem)] max-w-none translate-x-[-50%] translate-y-0 gap-0 overflow-hidden rounded-[2rem] border border-white/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.99),rgba(244,247,251,0.98))] p-0 shadow-[0_40px_120px_-48px_rgba(15,23,42,0.62)] sm:bottom-auto sm:top-[50%] sm:w-full sm:max-w-[34rem] sm:translate-y-[-50%] dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(8,15,29,0.98),rgba(14,23,38,0.98))]"
        dir={isArabic ? 'rtl' : 'ltr'}
      >
        <div className="flex max-h-[92svh] flex-col">
          <div className="overflow-y-auto px-4 pb-5 pt-3 sm:px-6 sm:pb-6 sm:pt-5">
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-foreground/10 sm:hidden" />
            <DialogHeader
              className={cn(
                'gap-0 text-left',
                isArabic && 'text-right sm:text-right',
              )}
            >
              <div className="flex flex-wrap items-center gap-2 pe-10">
                <span className="inline-flex w-fit items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-cyan-700 dark:text-cyan-300">
                  <Brain className="h-3.5 w-3.5" />
                  <span>{t.dailyFocus}</span>
                </span>
                <span className="inline-flex items-center rounded-full border border-border/60 bg-background/80 px-3 py-1 text-xs font-bold text-muted-foreground dark:bg-white/[0.04]">
                  {cycleLabel}
                </span>
              </div>
              <DialogTitle className="mt-4 pe-10 text-[1.35rem] font-black tracking-[-0.03em] text-foreground sm:text-[1.55rem]">
                {t.todayQuestion}
              </DialogTitle>
              <DialogDescription className="sr-only">
                {t.dailyAiQuestionDesc}
              </DialogDescription>
            </DialogHeader>

            <div className="mt-5 rounded-[1.75rem] border border-border/60 bg-white/85 p-4 shadow-[0_24px_60px_-48px_rgba(6,182,212,0.6)] dark:bg-white/[0.04] sm:p-5">
              <div className="mb-3 flex items-center justify-between gap-3">
                <span className="inline-flex items-center rounded-full border border-foreground/10 bg-foreground/[0.04] px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-muted-foreground dark:border-white/10 dark:bg-white/[0.03]">
                  {questionLabel}
                </span>
              </div>

              {loading && !dailyFocus ? (
                <div className="animate-pulse space-y-3">
                  <div className="h-4 w-5/6 rounded-full bg-muted/70" />
                  <div className="h-4 w-full rounded-full bg-muted/60" />
                  <div className="h-4 w-3/4 rounded-full bg-muted/50" />
                </div>
              ) : (
                <p className="text-base font-bold leading-8 text-foreground sm:text-[1.05rem]">
                  {dailyFocus?.question || t.dailyFocusUnavailable}
                </p>
              )}
            </div>

            <div className="mt-4">
              <label className="mb-2 block text-[11px] font-black uppercase tracking-[0.18em] text-muted-foreground">
                {t.answerQuestion}
              </label>
              <textarea
                value={answer}
                onChange={(event) => onAnswerChange(event.target.value)}
                placeholder={t.answerQuestionPlaceholder}
                disabled={loading || submitting}
                className={cn(
                  'min-h-[160px] w-full rounded-[1.5rem] border border-border/70 bg-background/80 px-4 py-3.5 text-sm leading-7 text-foreground outline-none transition-all placeholder:text-muted-foreground/70 focus:border-cyan-600/40 focus:bg-background dark:bg-background/30',
                  (loading || submitting) && 'cursor-not-allowed opacity-80',
                )}
                dir={isArabic ? 'rtl' : 'ltr'}
              />
            </div>
          </div>

          <div className="border-t border-border/60 bg-background/85 px-4 py-4 backdrop-blur sm:px-6 sm:py-5 dark:bg-background/20">
            <button
              onClick={onSubmit}
              disabled={submitDisabled}
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[1.25rem] bg-primary px-5 text-sm font-black text-primary-foreground shadow-[0_20px_40px_-24px_rgba(14,165,233,0.8)] transition-all hover:translate-y-[-1px] hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              {t.submitAnswer}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
