"use client";

import { Loader2, Send, Sparkles, X } from "lucide-react";
import { translations, type Language } from "@/lib/translations";
import type { DailyFocusSession } from "@/lib/daily-focus";
import { cn } from "@/lib/utils";
import VoiceRecorder from "@/components/shared/VoiceRecorder";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";

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
  onAppendTranscript: (text: string) => void;
  onSubmit: () => void;
}

export default function DailyFocusQuestionDialog({
  open,
  onOpenChange,
  language = "en",
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
    : `Q${currentQuestionNumber}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className={cn(
          // Mobile: bottom sheet
          "fixed bottom-0 left-0 right-0 top-auto w-full max-w-none translate-x-0 translate-y-0",
          "rounded-t-[1.5rem] rounded-b-none",
          // Desktop: centered modal (medium width)
          "sm:bottom-auto sm:left-1/2 sm:right-auto sm:top-1/2",
          "sm:w-full sm:max-w-xl",
          "sm:-translate-x-1/2 sm:-translate-y-1/2",
          "sm:rounded-3xl",
          // Base styles
          "gap-0 overflow-hidden border border-border/50 bg-background p-0",
          "shadow-[0_-8px_32px_rgba(0,0,0,0.08)] sm:shadow-[0_8px_32px_rgba(0,0,0,0.12)]",
          "dark:border-white/8 dark:shadow-[0_-8px_32px_rgba(0,0,0,0.3)] dark:sm:shadow-[0_8px_32px_rgba(0,0,0,0.4)]",
        )}
        dir={isArabic ? "rtl" : "ltr"}
      >
        <div className="flex max-h-[90svh] flex-col sm:max-h-[min(85vh,40rem)]">
          {/* Single custom close button — logical inset for LTR/RTL */}
          <DialogClose className="absolute top-4 end-4 z-10 flex size-9 items-center justify-center rounded-full bg-muted/50 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus:outline-none sm:top-5 sm:end-5">
            <X className="size-5" />
            <span className="sr-only">Close</span>
          </DialogClose>

          {/* ── Scroll area ── */}
          <div className="flex-1 overflow-y-auto pb-4">
            {/* Mobile drag handle */}
            <div className="flex justify-center pt-3 sm:hidden">
              <div className="h-1.5 w-12 rounded-full bg-foreground/10" />
            </div>

            {/* Header — padding respects dir; title scale is medium */}
            <div className="px-5 pt-5 pb-4 pe-14 sm:px-7 sm:pt-7 sm:pb-5 sm:pe-16">
              <DialogHeader
                className={cn(
                  "gap-0 space-y-0 !text-start sm:!text-start",
                  isArabic ? "items-end" : "items-start",
                )}
              >
                {/* Badge row: logical separator works in both directions */}
                <div
                  className={cn(
                    "mb-2.5 flex flex-wrap items-center gap-x-2 gap-y-2",
                    isArabic ? "justify-end" : "justify-start",
                  )}
                >
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-primary dark:bg-primary/20">
                    <Sparkles className="size-3.5 shrink-0" aria-hidden />
                    {t.dailyFocus}
                  </span>
                  <span className="text-[12px] font-semibold text-muted-foreground/80 ms-0.5 border-s border-border/60 ps-2.5 dark:border-white/10">
                    {cycleLabel}
                  </span>
                </div>

                <DialogTitle className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                  {t.todayQuestion}
                </DialogTitle>

                <DialogDescription className="sr-only">
                  {t.dailyAiQuestionDesc}
                </DialogDescription>
              </DialogHeader>
            </div>

            {/* Divider */}
            <div className="mx-5 h-px bg-linear-to-r from-transparent via-border/60 to-transparent sm:mx-7" />

            {/* Question block */}
            <div className="px-5 py-5 sm:px-7 sm:py-6">
              {/* Question number label */}
              <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-primary/75 sm:text-[11px]">
                {questionLabel}
              </p>

              {loading && !dailyFocus ? (
                <div className="space-y-3">
                  <div className="h-4 w-full animate-pulse rounded-full bg-muted" />
                  <div className="h-4 w-5/6 animate-pulse rounded-full bg-muted" />
                  <div className="h-4 w-4/6 animate-pulse rounded-full bg-muted" />
                </div>
              ) : (
                <>
                  <p
                    className={cn(
                      "whitespace-pre-line text-base font-semibold leading-7 text-foreground sm:text-[1.0625rem] sm:leading-relaxed",
                      "text-start",
                    )}
                  >
                    {dailyFocus?.question || t.dailyFocusUnavailable}
                  </p>

                  {dailyFocus?.question_why && (
                    <div
                      className={cn(
                        "mt-5 rounded-xl border border-primary/10 bg-primary/5 px-3.5 py-3 dark:bg-white/5 sm:rounded-2xl sm:px-4 sm:py-3.5",
                      )}
                    >
                      <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-primary/65 sm:text-[11px]">
                        {t.questionWhyLabel}
                      </p>
                      <p
                        className={cn(
                          "whitespace-pre-line text-[13px] leading-relaxed text-muted-foreground font-medium",
                          "text-start",
                        )}
                      >
                        {dailyFocus.question_why}
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Divider */}
            <div className="mx-5 h-px bg-border/40 sm:mx-7" />

            {/* Answer area */}
            <div className="px-5 pt-5 pb-2 sm:px-7">
              <label className="mb-2 block text-start text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground/85 sm:text-[11px]">
                {t.answerQuestion}
              </label>

              <div className="relative">
                <textarea
                  value={answer}
                  onChange={(e) => onAnswerChange(e.target.value)}
                  placeholder={t.answerQuestionPlaceholder}
                  disabled={loading || submitting}
                  rows={4}
                  className={cn(
                    "w-full resize-none rounded-2xl border-2 border-border/40 bg-muted/30",
                    "px-4 py-3.5 pb-14 pe-14",
                    "text-sm leading-relaxed text-foreground placeholder:text-muted-foreground/45 sm:text-[15px]",
                    "text-start outline-none transition-all duration-200",
                    "focus:border-primary/30 focus:bg-background focus:ring-4 focus:ring-primary/5",
                    "dark:bg-white/5 dark:border-white/5 dark:focus:bg-white/10",
                    (loading || submitting) && "cursor-not-allowed opacity-60",
                  )}
                  dir={isArabic ? "rtl" : "ltr"}
                />

                {/* Mic: inset-inline-end follows RTL/LTR */}
                <div
                  className={cn(
                    "absolute bottom-3 end-3 flex flex-col",
                    isArabic ? "items-start" : "items-end",
                  )}
                >
                  <VoiceRecorder
                    onTranscript={onAppendTranscript}
                    language={language}
                    size="sm"
                    statusAboveButton
                    className="gap-1"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ── Footer ── */}
          <div className="border-t border-border/50 bg-background px-5 py-4 sm:px-7 sm:py-5">
            <button
              type="button"
              onClick={onSubmit}
              disabled={submitDisabled}
              className={cn(
                "group relative flex h-12 w-full items-center justify-center gap-2.5 rounded-xl bg-primary px-5 sm:h-[3.25rem] sm:rounded-2xl",
                "text-sm font-bold text-primary-foreground sm:text-[0.9375rem]",
                "transition-all duration-200",
                "hover:brightness-110 active:scale-[0.99] shadow-md shadow-primary/15",
                "disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none",
                isArabic && "flex-row-reverse",
              )}
            >
              {submitting ? (
                <Loader2 className="size-5 animate-spin" />
              ) : (
                <>
                  <Send
                    className="size-[1.125rem] shrink-0 transition-transform group-hover:-translate-y-0.5 ltr:group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5"
                    aria-hidden
                  />
                  <span>{t.submitAnswer}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
