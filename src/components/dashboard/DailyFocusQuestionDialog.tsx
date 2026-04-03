'use client';

import { Brain, Loader2, WandSparkles } from 'lucide-react';
import { translations, type Language } from '@/lib/translations';
import type { DailyFocusSession } from '@/lib/daily-focus';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import VoiceRecorder from '../shared/VoiceRecorder';

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
  onAppendTranscript: (transcript: string) => void;
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
  onAppendTranscript,
  onSubmit,
}: DailyFocusQuestionDialogProps) {
  const t = translations[language];
  const submitDisabled = submitting || loading || !answer.trim();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="overflow-hidden rounded-[2rem] border border-border/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.96))] p-0 shadow-2xl sm:max-w-[34rem] dark:bg-[linear-gradient(180deg,rgba(17,24,39,0.98),rgba(15,23,42,0.96))]"
        dir={isArabic ? 'rtl' : 'ltr'}
      >
        <div className="border-b border-border/60 px-6 py-5">
          <DialogHeader className={isArabic ? 'sm:text-right' : undefined}>
            <div className="mb-3 inline-flex w-fit items-center gap-2 rounded-full border border-cyan-600/20 bg-cyan-600/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-cyan-700 dark:text-cyan-300">
              <Brain className="h-3.5 w-3.5" />
              <span>{t.dailyAiQuestion}</span>
            </div>
            <DialogTitle className="text-xl font-black leading-8 text-foreground">
              {dailyFocus?.question || t.dailyFocusUnavailable}
            </DialogTitle>
            <DialogDescription className="pt-2 text-sm leading-7 text-muted-foreground">
              {t.answerQuestion}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="space-y-4 px-6 py-5">
          <textarea
            value={answer}
            onChange={(event) => onAnswerChange(event.target.value)}
            placeholder={t.answerQuestionPlaceholder}
            className="min-h-36 w-full rounded-3xl border border-border/70 bg-background/70 px-4 py-3 text-sm leading-7 text-foreground outline-none transition-colors placeholder:text-muted-foreground/75 focus:border-cyan-600/40"
            dir={isArabic ? 'rtl' : 'ltr'}
          />

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <VoiceRecorder
              onTranscript={onAppendTranscript}
              language={isArabic ? 'ar' : 'en'}
              className="items-start"
            />

            <button
              onClick={onSubmit}
              disabled={submitDisabled}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-primary px-5 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <WandSparkles className="h-4 w-4" />
              )}
              {t.generateSuggestions}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
