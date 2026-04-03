'use client';

import {
  CheckCircle2,
  Loader2,
  Sparkles,
  WandSparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { translations, type Language } from '@/lib/translations';
import type { DailyFocusSession } from '@/lib/daily-focus';
import VoiceRecorder from '../shared/VoiceRecorder';

interface DailyFocusPanelProps {
  language?: Language;
  isArabic: boolean;
  dailyFocus: DailyFocusSession | null;
  loading: boolean;
  submitting: boolean;
  addingSuggestionId: string | null;
  error: string | null;
  answer: string;
  onAnswerChange: (value: string) => void;
  onAnswerSubmit: () => void;
  onAppendTranscript: (transcript: string) => void;
  onAddSuggestion: (suggestionId: string) => void;
  onRetry: () => void;
}

export default function DailyFocusPanel({
  language = 'en',
  isArabic,
  dailyFocus,
  loading,
  submitting,
  addingSuggestionId,
  error,
  answer,
  onAnswerChange,
  onAnswerSubmit,
  onAppendTranscript,
  onAddSuggestion,
  onRetry,
}: DailyFocusPanelProps) {
  const t = translations[language];
  const submitDisabled = submitting || !answer.trim();

  if (loading && !dailyFocus) {
    return (
      <div className="space-y-3">
        <div className="animate-pulse rounded-2xl border border-border/70 bg-muted/30 p-4">
          <div className="h-4 w-28 rounded-full bg-muted/70" />
          <div className="mt-3 h-4 w-11/12 rounded-full bg-muted/70" />
          <div className="mt-2 h-3 w-3/5 rounded-full bg-muted/60" />
          <div className="mt-4 h-10 rounded-xl bg-muted/60" />
        </div>
        <div className="animate-pulse rounded-2xl border border-border/70 bg-muted/30 p-4">
          <div className="h-4 w-28 rounded-full bg-muted/70" />
          <div className="mt-3 h-4 w-11/12 rounded-full bg-muted/70" />
          <div className="mt-2 h-24 rounded-xl bg-muted/60" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <section className="rounded-2xl border border-border/70 bg-white/90 p-4 dark:bg-card/60">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-foreground">
              {t.suggestedTasks}
            </h3>
            <p className="text-xs text-muted-foreground/90">
              {dailyFocus?.suggestions_unlocked
                ? dailyFocus?.answered_at
                  ? t.suggestionsFromAnswer
                  : t.suggestionsReady
                : t.suggestionStrategyNote}
            </p>
          </div>

          <button
            onClick={onRetry}
            disabled={loading || submitting}
            className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-border/60 bg-background/80 px-3 text-xs font-semibold text-foreground transition-colors hover:bg-background disabled:cursor-not-allowed disabled:opacity-60 dark:bg-background/20"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <WandSparkles className="h-4 w-4" />}
            {t.retryQuestion}
          </button>
        </div>

        {dailyFocus && !dailyFocus.suggestions_unlocked ? (
          <div className="rounded-2xl border border-dashed border-border/70 bg-muted/[0.16] p-4">
            <h4 className="text-sm font-bold text-foreground">
              {t.suggestionsLockedTitle}
            </h4>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {t.suggestionsLockedDesc}
            </p>
            <div className="mt-3 inline-flex items-center rounded-full border border-cyan-600/20 bg-cyan-600/10 px-3 py-1 text-xs font-bold text-cyan-700 dark:text-cyan-300">
              {t.answeredDaysProgress}: {dailyFocus.answered_days_count}/{dailyFocus.required_answer_days}
            </div>
          </div>
        ) : dailyFocus?.suggestions.length ? (
          <div className="space-y-2.5">
            {dailyFocus.suggestions.map((suggestion) => {
              const isAdded = dailyFocus.addedSuggestionIds.includes(suggestion.id);
              const isAdding = addingSuggestionId === suggestion.id;

              return (
                <div
                  key={suggestion.id}
                  className="rounded-xl border border-border/70 bg-background/70 p-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <h4 className="text-sm font-semibold leading-6 text-foreground">
                      {suggestion.title}
                    </h4>
                    <span
                      className={cn(
                        'shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold',
                        suggestion.frequency === 'daily'
                          ? 'bg-cyan-600/10 text-cyan-700 dark:text-cyan-300'
                          : 'bg-violet-500/10 text-violet-600 dark:text-violet-300',
                      )}
                    >
                      {suggestion.frequency === 'daily' ? t.daily : t.weekly}
                    </span>
                  </div>

                  {suggestion.reason ? (
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      {suggestion.reason}
                    </p>
                  ) : null}

                  <button
                    onClick={() => onAddSuggestion(suggestion.id)}
                    disabled={isAdded || isAdding}
                    className={cn(
                      'mt-3 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-all',
                      isAdded
                        ? 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                        : 'bg-primary text-primary-foreground hover:opacity-90',
                      isAdding && 'cursor-not-allowed opacity-70',
                    )}
                  >
                    {isAdding ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : isAdded ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <Sparkles className="h-4 w-4" />
                    )}
                    {isAdded ? t.addedToFocus : t.addToFocus}
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-border/70 bg-muted/[0.16] px-4 py-6 text-sm text-muted-foreground">
            {error || t.dailyFocusUnavailable}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-border/70 bg-white/90 p-4 dark:bg-card/60">
        <div className="mb-3 space-y-1">
          <h3 className="text-sm font-bold text-foreground">
            {t.dailyQuestionSection}
          </h3>
          <p className="text-xs text-muted-foreground">
            {dailyFocus?.answered_at ? t.savedAnswerHint : t.answerLaterHint}
          </p>
        </div>

        {dailyFocus ? (
          <div className="space-y-3">
            <p className="rounded-xl border border-border/70 bg-background/70 px-3 py-2.5 text-sm font-medium leading-6 text-foreground">
              {dailyFocus.question}
            </p>

            <textarea
              value={answer}
              onChange={(event) => onAnswerChange(event.target.value)}
              placeholder={t.answerQuestionPlaceholder}
              className="min-h-28 w-full rounded-xl border border-border/70 bg-background/70 px-3 py-2.5 text-sm leading-6 text-foreground outline-none transition-colors placeholder:text-muted-foreground/75 focus:border-cyan-600/40"
              dir={isArabic ? 'rtl' : 'ltr'}
            />

            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <VoiceRecorder
                onTranscript={onAppendTranscript}
                language={isArabic ? 'ar' : 'en'}
                className="items-start"
              />

              <button
                onClick={onAnswerSubmit}
                disabled={submitDisabled}
                className={cn(
                  'inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition-all',
                  submitDisabled
                    ? 'cursor-not-allowed bg-muted text-muted-foreground'
                    : 'bg-primary text-primary-foreground hover:opacity-90',
                )}
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <WandSparkles className="h-4 w-4" />
                )}
                {dailyFocus.answered_at ? t.updateSuggestions : t.generateSuggestions}
              </button>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-border/70 bg-muted/[0.16] px-4 py-6 text-sm text-muted-foreground">
            {error || t.dailyFocusUnavailable}
          </div>
        )}
      </section>
    </div>
  );
}
