"use client";

import { useState } from "react";
import {
  Check,
  ChevronDown,
  Loader2,
  Plus,
  Send,
  Sparkles,
} from "lucide-react";
import { translations, type Language } from "@/lib/translations";
import type {
  DailyFocusHistoryItem,
  DailyFocusSession,
} from "@/lib/daily-focus";
import { cn } from "@/lib/utils";
import VoiceRecorder from "../shared/VoiceRecorder";

interface DailyFocusPanelProps {
  language?: Language;
  isArabic: boolean;
  dailyFocus: DailyFocusSession | null;
  dailyFocusHistory?: DailyFocusHistoryItem[];
  loading: boolean;
  submitting: boolean;
  addingSuggestionId: string | null;
  error: string | null;
  answer: string;
  onAnswerChange: (value: string) => void;
  onAnswerSubmit: () => void;
  onAppendTranscript: (text: string) => void;
  onAddSuggestion: (suggestionId: string) => void;
}

export default function DailyFocusPanel({
  language = "en",
  isArabic,
  dailyFocus,
  dailyFocusHistory = [],
  loading,
  submitting,
  addingSuggestionId,
  error,
  answer,
  onAnswerChange,
  onAnswerSubmit,
  onAppendTranscript,
  onAddSuggestion,
}: DailyFocusPanelProps) {
  const t = translations[language];
  const hasAnswer = Boolean(dailyFocus?.answered_at);
  const [questionOpen, setQuestionOpen] = useState(false);
  const [editingAnswer, setEditingAnswer] = useState(false);
  const [expandedSuggestion, setExpandedSuggestion] = useState<string | null>(
    null,
  );
  const [historyOpen, setHistoryOpen] = useState(false);
  const [expandedHistoryItem, setExpandedHistoryItem] = useState<string | null>(
    null,
  );

  const submitDisabled = submitting || loading || !answer.trim();
  const showAnswerInput = !hasAnswer || editingAnswer;

  const suggestions = dailyFocus?.suggestions ?? [];
  const suggestionsUnlocked = Boolean(dailyFocus?.suggestions_unlocked);
  const previousHistory = dailyFocusHistory.slice(0, 6);

  return (
    <div className="flex flex-col gap-3" dir={isArabic ? "rtl" : "ltr"}>
      {/* ======= Suggestions FIRST ======= */}
      <section className="rounded-2xl border border-border/60 bg-background/70 p-3 sm:p-4 dark:bg-card/40">
        <div className="flex items-center gap-2">
          <h4 className="text-[13px] font-black text-foreground">
            {isArabic ? "المهام المقترحة" : "Suggested Tasks"}
          </h4>
          <span className="ms-auto text-[10px] text-muted-foreground">
            {suggestions.length}
          </span>
        </div>

        {suggestions.length === 0 ? (
          <div className="mt-3 rounded-xl border border-dashed border-border/60 bg-muted/20 p-4 text-center dark:bg-white/[0.03]">
            <p className="text-xs font-bold text-muted-foreground">
              {suggestionsUnlocked ? t.suggestionEmpty : t.suggestionsLocked}
            </p>
            <p className="mt-1 text-[10px] leading-5 text-muted-foreground/70">
              {suggestionsUnlocked
                ? t.suggestionEmptyDescription
                : t.suggestionsLockedDescription}
            </p>
          </div>
        ) : (
          <div className="mt-3 space-y-2">
            {suggestions.map((suggestion) => {
              const isExpanded = expandedSuggestion === suggestion.id;

              return (
                <div
                  key={suggestion.id}
                  className="rounded-xl border border-border/60 bg-background/60 transition-all hover:border-primary/30 dark:bg-card/30"
                >
                  <div className="flex items-center gap-2.5 px-3 py-2.5">
                    {/* Emoji */}
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted/40 text-lg">
                      {suggestion.emoji || "🎯"}
                    </span>

                    {/* Title + type badge */}
                    <div className="min-w-0 flex-1">
                      <h5 className="text-[13px] font-bold leading-5 text-foreground">
                        {suggestion.title}
                      </h5>
                      <span
                        className={cn(
                          "mt-0.5 inline-flex items-center rounded-full border px-1.5 py-px text-[9px] font-bold",
                          suggestion.support_type === "goal_task"
                            ? "border-cyan-500/25 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300"
                            : "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300",
                        )}
                      >
                        {suggestion.support_type === "goal_task"
                          ? t.suggestionInGoal
                          : t.suggestionExternalBooster}
                      </span>
                    </div>

                    {/* Add + Expand */}
                    <button
                      type="button"
                      onClick={() => onAddSuggestion(suggestion.id)}
                      disabled={addingSuggestionId === suggestion.id}
                      className="shrink-0 rounded-lg bg-primary/10 p-1.5 text-primary transition-all hover:bg-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
                      aria-label={isArabic ? "إضافة" : "Add"}
                    >
                      {addingSuggestionId === suggestion.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Plus className="h-3.5 w-3.5" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedSuggestion(isExpanded ? null : suggestion.id)
                      }
                      className="shrink-0 rounded-lg p-1 text-muted-foreground transition-colors hover:text-foreground"
                    >
                      <ChevronDown
                        className={cn(
                          "h-3.5 w-3.5 transition-transform",
                          isExpanded && "rotate-180",
                        )}
                      />
                    </button>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-border/40 px-3 pb-3 pt-2">
                      <p className="text-[11px] leading-5 text-muted-foreground">
                        {suggestion.reason}
                      </p>
                      <div className="mt-1.5 flex items-center gap-3 text-[10px] text-muted-foreground">
                        <span>
                          {suggestion.frequency === "daily"
                            ? t.daily
                            : t.weekly}
                        </span>
                        <span>
                          {isArabic
                            ? `أهمية: ${suggestion.impact_weight}`
                            : `Impact: ${suggestion.impact_weight}`}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ======= Question (BELOW suggestions, collapsible) ======= */}
      <section className="rounded-2xl border border-border/60 bg-background/70 dark:bg-card/40">
        <button
          type="button"
          onClick={() => setQuestionOpen(!questionOpen)}
          className="w-full px-3 py-2.5 text-start transition-colors hover:bg-muted/30"
        >
          <div className="flex items-center gap-2">
            <h4 className="text-[13px] font-black text-foreground">
              {isArabic ? "السؤال" : "Question"}
            </h4>
            {dailyFocus?.angle_label ? (
              <span className="inline-flex items-center rounded-full border border-border/60 bg-background/80 px-2 py-0.5 text-[9px] font-bold text-muted-foreground dark:bg-white/[0.03]">
                {dailyFocus.angle_label}
              </span>
            ) : null}
            {hasAnswer ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 text-[9px] font-bold text-emerald-700 dark:text-emerald-300">
                <Check className="h-3 w-3" />
                {isArabic ? "تم الجواب" : "Answered"}
              </span>
            ) : null}
            <ChevronDown
              className={cn(
                "ms-auto h-3.5 w-3.5 transition-transform",
                questionOpen && "rotate-180",
              )}
            />
          </div>
        </button>

        {questionOpen && (
          <div className="border-t border-border/40 px-3 pb-3 pt-2.5">
            {loading && !dailyFocus ? (
              <div className="animate-pulse space-y-2">
                <div className="h-4 w-5/6 rounded-full bg-muted/70" />
                <div className="h-4 w-2/3 rounded-full bg-muted/50" />
              </div>
            ) : (
              <>
                <h3 className="whitespace-pre-line text-[14px] font-bold leading-7 text-foreground">
                  {dailyFocus?.question || t.dailyFocusUnavailable}
                </h3>
                {dailyFocus?.question_why ? (
                  <div className="mt-2 rounded-lg border border-border/40 bg-muted/20 p-2.5 dark:bg-white/[0.03]">
                    <p className="text-[10px] font-bold text-foreground/70">
                      {t.questionWhyLabel}
                    </p>
                    <p className="mt-1 whitespace-pre-line text-[11px] leading-5 text-muted-foreground">
                      {dailyFocus.question_why}
                    </p>
                  </div>
                ) : null}
              </>
            )}

            {error ? (
              <p className="mt-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-[11px] text-destructive">
                {error}
              </p>
            ) : null}

            {/* Answer area */}
            {showAnswerInput ? (
              <div className="mt-3">
                <div className="relative">
                  <textarea
                    value={answer}
                    onChange={(event) => onAnswerChange(event.target.value)}
                    placeholder={t.answerQuestionPlaceholder}
                    disabled={loading || submitting}
                    className={cn(
                      "min-h-20 w-full rounded-xl border border-border/70 bg-background/80 px-3 py-2.5 pe-12 text-[13px] leading-6 text-foreground outline-none transition-all placeholder:text-muted-foreground/70 focus:border-cyan-600/40 focus:bg-background dark:bg-background/30",
                      (loading || submitting) &&
                        "cursor-not-allowed opacity-80",
                    )}
                    dir={isArabic ? "rtl" : "ltr"}
                  />
                  <div className="pointer-events-auto absolute bottom-2 end-2">
                    <VoiceRecorder
                      onTranscript={onAppendTranscript}
                      language={language}
                      statusAboveButton
                      className="items-end"
                    />
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onAnswerSubmit();
                      setEditingAnswer(false);
                    }}
                    disabled={submitDisabled}
                    className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary px-3 text-[12px] font-bold text-primary-foreground shadow-sm transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {submitting ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Send className="h-3.5 w-3.5" />
                    )}
                    {t.submitAnswer}
                  </button>
                  {hasAnswer ? (
                    <button
                      type="button"
                      onClick={() => setEditingAnswer(false)}
                      className="inline-flex h-9 items-center justify-center rounded-xl border border-border/60 px-3 text-[12px] font-bold text-muted-foreground transition-all hover:text-foreground"
                    >
                      {t.cancel}
                    </button>
                  ) : null}
                </div>
              </div>
            ) : hasAnswer ? (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditingAnswer(true)}
                  className="inline-flex h-8 items-center gap-1.5 rounded-full border border-border/60 bg-background/70 px-3 text-[11px] font-bold text-muted-foreground transition-all hover:border-primary/30 hover:text-foreground dark:bg-white/[0.04]"
                >
                  {t.editSavedAnswer}
                </button>
              </div>
            ) : null}

            {hasAnswer && !editingAnswer ? (
              <div className="mt-2 space-y-2 rounded-xl border border-border/50 bg-muted/20 p-3 dark:bg-white/[0.03]">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                    {t.answerQuestion}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-[12px] leading-6 text-foreground">
                    {dailyFocus?.answer || "—"}
                  </p>
                </div>
                {dailyFocus?.answer_coaching ? (
                  <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/[0.06] p-2.5">
                    <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-cyan-700 dark:text-cyan-300">
                      <Sparkles className="h-3 w-3" />
                      {t.aiCoachingLabel}
                    </p>
                    <p className="mt-1 text-[12px] leading-6 text-foreground">
                      {dailyFocus.answer_coaching}
                    </p>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        )}
      </section>

      {previousHistory.length > 0 ? (
        <section className="rounded-2xl border border-border/60 bg-background/70 dark:bg-card/40">
          <button
            type="button"
            onClick={() => setHistoryOpen(!historyOpen)}
            className="w-full px-3 py-2.5 text-start transition-colors hover:bg-muted/30"
          >
            <div className="flex items-center gap-2">
              <h4 className="text-[13px] font-black text-foreground">
                {isArabic ? "الأسئلة السابقة" : "Previous Questions"}
              </h4>
              <span className="rounded-full border border-border/60 bg-background/80 px-2 py-0.5 text-[9px] font-bold text-muted-foreground dark:bg-white/[0.03]">
                {previousHistory.length}
              </span>
              <ChevronDown
                className={cn(
                  "ms-auto h-3.5 w-3.5 transition-transform",
                  historyOpen && "rotate-180",
                )}
              />
            </div>
          </button>

          {historyOpen ? (
            <div className="border-t border-border/40 px-3 pb-3 pt-2.5">
              <p className="text-[10px] leading-5 text-muted-foreground/75">
                {isArabic
                  ? "الأسئلة السابقة للعرض فقط، والتعديل متاح بس على جواب اليوم."
                  : "Previous questions are read-only. Only today’s answer is editable."}
              </p>

              <div className="mt-3 space-y-2">
                {previousHistory.map((item) => {
                  const itemKey = `${item.prompt_date}-${item.question}`;
                  const itemOpen = expandedHistoryItem === itemKey;

                  return (
                    <article
                      key={itemKey}
                      className="overflow-hidden rounded-xl border border-border/50 bg-muted/15 dark:bg-white/[0.03]"
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedHistoryItem(itemOpen ? null : itemKey)
                        }
                        className="w-full px-3 py-2.5 text-start transition-colors hover:bg-muted/25"
                      >
                        <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground">
                          <span>{item.prompt_date}</span>
                          {item.answered_at ? (
                            <span className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 text-emerald-700 dark:text-emerald-300">
                              {isArabic ? "محفوظ" : "Saved"}
                            </span>
                          ) : null}
                          <ChevronDown
                            className={cn(
                              "ms-auto h-3.5 w-3.5 transition-transform",
                              itemOpen && "rotate-180",
                            )}
                          />
                        </div>
                        <p className="mt-1 line-clamp-1 text-[12px] font-bold leading-5 text-foreground">
                          {item.question}
                        </p>
                      </button>

                      {itemOpen ? (
                        <div className="border-t border-border/40 px-3 pb-3 pt-2.5">
                          <p className="whitespace-pre-line text-[12px] font-bold leading-6 text-foreground">
                            {item.question}
                          </p>
                          <div className="mt-2 rounded-lg border border-border/40 bg-background/55 p-2.5 dark:bg-background/20">
                            <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                              {t.answerQuestion}
                            </p>
                            <p className="mt-1 whitespace-pre-wrap text-[12px] leading-6 text-foreground">
                              {item.answer || "—"}
                            </p>
                          </div>
                          {item.answer_coaching ? (
                            <p className="mt-2 whitespace-pre-line text-[11px] leading-5 text-muted-foreground">
                              {item.answer_coaching}
                            </p>
                          ) : null}
                        </div>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
