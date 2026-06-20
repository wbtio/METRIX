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
  missedDailyFocusHistory?: DailyFocusHistoryItem[];
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
  missedDailyFocusHistory = [],
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
  const [missedHistoryOpen, setMissedHistoryOpen] = useState(false);
  const [expandedMissedItem, setExpandedMissedItem] = useState<string | null>(
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
      <section className="rounded-2xl border border-border/50 bg-card p-4 sm:p-5 shadow-[0_1px_3px_-1px_rgba(0,0,0,0.03)] dark:bg-card/50 dark:shadow-[0_1px_3px_-1px_rgba(0,0,0,0.15)]">
        <div className="flex items-center gap-2">
          <h4 className="text-[15px] font-extrabold text-foreground tracking-tight">
            {isArabic ? "المهام المقترحة" : "Suggested Tasks"}
          </h4>
          <span className="ms-auto text-[11px] font-bold text-muted-foreground/60 tabular-nums bg-muted/30 px-2 py-0.5 rounded-full border border-border/30">
            {suggestions.length}
          </span>
        </div>

        {suggestions.length === 0 ? (
          <div className="mt-4 flex flex-col items-center justify-center gap-2.5 rounded-2xl border border-dashed border-border/40 bg-muted/[0.03] p-5 text-center">
            <span className="text-2xl opacity-50">🎯</span>
            <p className="text-xs font-bold text-muted-foreground">
              {suggestionsUnlocked ? t.suggestionEmpty : t.suggestionsLocked}
            </p>
            <p className="text-[11px] leading-relaxed text-muted-foreground/60 max-w-[18rem]">
              {suggestionsUnlocked
                ? t.suggestionEmptyDescription
                : t.suggestionsLockedDescription}
            </p>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {suggestions.map((suggestion) => {
              const isExpanded = expandedSuggestion === suggestion.id;

              return (
                <div
                  key={suggestion.id}
                  className="group rounded-xl border border-border/50 bg-background/70 transition-all duration-200 hover:border-primary/25 hover:shadow-md hover:-translate-y-0.5 dark:bg-card/30 dark:hover:bg-card/40"
                >
                  <div className="flex items-center gap-3 px-3.5 py-3">
                    {/* Emoji */}
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted/25 text-xl border border-border/30 shadow-sm">
                      {suggestion.emoji || "🎯"}
                    </span>

                    {/* Title + type badge */}
                    <div className="min-w-0 flex-1">
                      <h5 className="text-[14px] font-bold leading-snug text-foreground">
                        {suggestion.title}
                      </h5>
                      <span
                        className={cn(
                          "mt-1.5 inline-flex items-center rounded-full border px-2.5 py-px text-[10px] font-bold",
                          suggestion.support_type === "goal_task"
                            ? "border-cyan-500/15 bg-cyan-500/[0.08] text-cyan-700 dark:text-cyan-300 shadow-sm shadow-cyan-500/5"
                            : "border-amber-500/15 bg-amber-500/[0.08] text-amber-700 dark:text-amber-300 shadow-sm shadow-amber-500/5",
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
                      className="shrink-0 rounded-xl bg-primary/[0.08] border border-primary/[0.12] p-2 text-primary transition-all duration-200 hover:bg-primary/15 hover:border-primary/25 hover:shadow-sm active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                      aria-label={isArabic ? "إضافة" : "Add"}
                    >
                      {addingSuggestionId === suggestion.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Plus className="h-4 w-4" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedSuggestion(isExpanded ? null : suggestion.id)
                      }
                      className="shrink-0 rounded-xl p-2 text-muted-foreground/60 transition-all duration-200 hover:text-foreground hover:bg-muted/40 active:scale-95"
                    >
                      <ChevronDown
                        className={cn(
                          "h-4 w-4 transition-transform duration-200",
                          isExpanded && "rotate-180",
                        )}
                      />
                    </button>
                  </div>

                  {/* Expanded suggestion details with grid transition */}
                  <div
                    className="grid transition-[grid-template-rows] duration-200 ease-out-quart"
                    style={{ gridTemplateRows: isExpanded ? "1fr" : "0fr" }}
                  >
                    <div className="overflow-hidden">
                      <div className="border-t border-border/30 px-3.5 pb-3.5 pt-3">
                        <p className="text-xs leading-relaxed text-muted-foreground/80">
                          {suggestion.reason}
                        </p>
                        <div className="mt-3 flex items-center gap-3">
                          <span className="inline-flex items-center gap-1 rounded-full bg-muted/40 px-2 py-px text-[10px] font-bold border border-border/30">
                            {suggestion.frequency === "daily"
                              ? t.daily
                              : t.weekly}
                          </span>
                          <span className="inline-flex items-center gap-1 rounded-full bg-muted/40 px-2 py-px text-[10px] font-bold border border-border/30">
                            {isArabic
                              ? `أهمية: ${suggestion.impact_weight}`
                              : `Impact: ${suggestion.impact_weight}`}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ======= Question (BELOW suggestions, collapsible) ======= */}
      <section className="rounded-2xl border border-border/50 bg-card shadow-[0_1px_3px_-1px_rgba(0,0,0,0.03)] dark:bg-card/50 dark:shadow-[0_1px_3px_-1px_rgba(0,0,0,0.15)] overflow-hidden">
        <button
          type="button"
          onClick={() => setQuestionOpen(!questionOpen)}
          className="w-full px-4 py-3 sm:px-5 text-start transition-colors hover:bg-muted/[0.04]"
        >
          <div className="flex items-center gap-2.5">
            <h4 className="text-[15px] font-extrabold text-foreground tracking-tight">
              {isArabic ? "السؤال" : "Question"}
            </h4>
            {dailyFocus?.angle_label ? (
              <span className="inline-flex items-center rounded-full border border-border/50 bg-background/80 px-2.5 py-0.5 text-[10px] font-bold text-muted-foreground dark:bg-white/[0.04] shadow-sm">
                {dailyFocus.angle_label}
              </span>
            ) : null}
            {hasAnswer ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/15 bg-emerald-500/[0.08] px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 shadow-sm shadow-emerald-500/5">
                <Check className="h-3.5 w-3.5" />
                {isArabic ? "تم الجواب" : "Answered"}
              </span>
            ) : null}
            <ChevronDown
              className={cn(
                "ms-auto h-4 w-4 text-muted-foreground/50 transition-transform duration-200",
                questionOpen && "rotate-180",
              )}
            />
          </div>
        </button>

        <div
          className="grid transition-[grid-template-rows] duration-200 ease-out-quart"
          style={{ gridTemplateRows: questionOpen ? "1fr" : "0fr" }}
        >
          <div className="overflow-hidden">
            <div className="border-t border-border/25 px-4 pb-4 pt-3 sm:px-5">
            {loading && !dailyFocus ? (
              <div className="animate-pulse space-y-3">
                <div className="h-4 w-5/6 rounded-xl bg-muted/40" />
                <div className="h-4 w-2/3 rounded-xl bg-muted/30" />
              </div>
            ) : (
              <>
                <h3 className="whitespace-pre-line text-[15px] font-bold leading-relaxed text-foreground">
                  {dailyFocus?.question || t.dailyFocusUnavailable}
                </h3>
                {dailyFocus?.question_why ? (
                  <div className="mt-3 rounded-xl border border-border/30 bg-muted/[0.04] p-3.5 dark:bg-white/[0.03] shadow-sm">
                    <p className="text-[11px] font-bold text-foreground/70 uppercase tracking-wider">
                      {t.questionWhyLabel}
                    </p>
                    <p className="mt-1.5 whitespace-pre-line text-xs leading-relaxed text-muted-foreground/80">
                      {dailyFocus.question_why}
                    </p>
                  </div>
                ) : null}
              </>
            )}

            {error ? (
              <p className="mt-3 rounded-xl border border-destructive/15 bg-destructive/[0.04] px-3.5 py-2.5 text-xs text-destructive font-medium">
                {error}
              </p>
            ) : null}

            {/* Answer area */}
            {showAnswerInput ? (
              <div className="mt-4">
                <div className="relative">
                  <textarea
                    value={answer}
                    onChange={(event) => onAnswerChange(event.target.value)}
                    placeholder={t.answerQuestionPlaceholder}
                    disabled={loading || submitting}
                    className={cn(
                      "min-h-24 w-full rounded-xl border border-border/50 bg-background/80 px-4 py-3 pe-14 text-sm leading-relaxed text-foreground outline-none transition-all placeholder:text-muted-foreground/40 focus:border-primary/30 focus:bg-background focus:ring-2 focus:ring-primary/8 dark:bg-background/30 shadow-sm",
                      (loading || submitting) &&
                        "cursor-not-allowed opacity-70",
                    )}
                    dir={isArabic ? "rtl" : "ltr"}
                  />
                  <div className="pointer-events-auto absolute bottom-3 end-3">
                    <VoiceRecorder
                      onTranscript={onAppendTranscript}
                      language={language}
                      statusAboveButton
                      className="items-end"
                    />
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      onAnswerSubmit();
                      setEditingAnswer(false);
                    }}
                    disabled={submitDisabled}
                    className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-[13px] font-bold text-primary-foreground shadow-md shadow-primary/10 transition-all duration-200 hover:opacity-90 hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98]"
                  >
                    {submitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    {t.submitAnswer}
                  </button>
                  {hasAnswer ? (
                    <button
                      type="button"
                      onClick={() => setEditingAnswer(false)}
                      className="inline-flex h-10 items-center justify-center rounded-xl border border-border/50 px-4 text-[13px] font-semibold text-muted-foreground transition-all duration-200 hover:text-foreground hover:bg-muted/30 active:scale-[0.98]"
                    >
                      {t.cancel}
                    </button>
                  ) : null}
                </div>
              </div>
            ) : hasAnswer ? (
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditingAnswer(true)}
                  className="inline-flex h-9 items-center gap-2 rounded-full border border-border/50 bg-background/70 px-4 text-xs font-bold text-muted-foreground transition-all duration-200 hover:border-primary/25 hover:text-foreground hover:shadow-sm dark:bg-white/[0.04]"
                >
                  {t.editSavedAnswer}
                </button>
              </div>
            ) : null}

            {hasAnswer && !editingAnswer ? (
              <div className="mt-4 space-y-3 rounded-2xl border border-border/40 bg-muted/[0.03] p-4 dark:bg-white/[0.03] shadow-sm">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/70">
                    {t.answerQuestion}
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                    {dailyFocus?.answer || "—"}
                  </p>
                </div>
                {dailyFocus?.answer_coaching ? (
                  <div className="rounded-xl border border-cyan-500/15 bg-cyan-500/[0.06] p-3.5 shadow-sm shadow-cyan-500/5">
                    <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-cyan-700 dark:text-cyan-300">
                      <Sparkles className="h-3.5 w-3.5" />
                      {t.aiCoachingLabel}
                    </p>
                    <p className="mt-2 text-sm leading-relaxed text-foreground">
                      {dailyFocus.answer_coaching}
                    </p>
                  </div>
                ) : null}
              </div>
            ) : null}
            </div>
          </div>
        </div>
      </section>

      {previousHistory.length > 0 ? (
        <section className="rounded-2xl border border-border/50 bg-card shadow-[0_1px_3px_-1px_rgba(0,0,0,0.03)] dark:bg-card/50 dark:shadow-[0_1px_3px_-1px_rgba(0,0,0,0.15)] overflow-hidden">
          <button
            type="button"
            onClick={() => setHistoryOpen(!historyOpen)}
            className="w-full px-4 py-3 sm:px-5 text-start transition-colors hover:bg-muted/[0.04]"
          >
            <div className="flex items-center gap-2.5">
              <h4 className="text-[15px] font-extrabold text-foreground tracking-tight">
                {isArabic ? "الأسئلة المُجاب عنها" : "Answered Questions"}
              </h4>
              <span className="rounded-full border border-emerald-500/15 bg-emerald-500/[0.08] px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 shadow-sm shadow-emerald-500/5">
                {previousHistory.length}
              </span>
              <ChevronDown
                className={cn(
                  "ms-auto h-4 w-4 text-muted-foreground/50 transition-transform duration-200",
                  historyOpen && "rotate-180",
                )}
              />
            </div>
          </button>

          <div
            className="grid transition-[grid-template-rows] duration-200 ease-out-quart"
            style={{ gridTemplateRows: historyOpen ? "1fr" : "0fr" }}
          >
            <div className="overflow-hidden">
              <div className="border-t border-border/25 px-4 pb-4 pt-3 sm:px-5">
              <p className="text-[11px] leading-relaxed text-muted-foreground/60">
                {isArabic
                  ? "سجل إجاباتك السابقة — كل إجابة تعمّق فهمنا لرحلتك."
                  : "Your previous answers — each one deepens our understanding of your journey."}
              </p>

              <div className="mt-4 space-y-3">
                {previousHistory.map((item) => {
                  const itemKey = `${item.prompt_date}-${item.question}`;
                  const itemOpen = expandedHistoryItem === itemKey;

                  return (
                    <article
                      key={itemKey}
                      className="overflow-hidden rounded-xl border border-border/40 bg-muted/[0.03] transition-all duration-200 hover:border-border/60 hover:shadow-sm dark:bg-white/[0.02]"
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedHistoryItem(itemOpen ? null : itemKey)
                        }
                        className="w-full px-3.5 py-3 text-start transition-colors hover:bg-muted/[0.04]"
                      >
                        <div className="flex items-center gap-2.5 text-[11px] font-bold text-muted-foreground/70">
                          <span>{item.prompt_date}</span>
                          <span className="rounded-full border border-emerald-500/15 bg-emerald-500/[0.08] px-2 py-0.5 text-emerald-700 dark:text-emerald-300 text-[10px]">
                            {isArabic ? "محفوظ" : "Saved"}
                          </span>
                          <ChevronDown
                            className={cn(
                              "ms-auto h-4 w-4 transition-transform duration-200",
                              itemOpen && "rotate-180",
                            )}
                          />
                        </div>
                        <p className="mt-1.5 line-clamp-1 text-[13px] font-bold leading-snug text-foreground">
                          {item.question}
                        </p>
                      </button>

                      <div
                        className="grid transition-[grid-template-rows] duration-200 ease-out-quart"
                        style={{ gridTemplateRows: itemOpen ? "1fr" : "0fr" }}
                      >
                        <div className="overflow-hidden">
                          <div className="border-t border-border/25 px-3.5 pb-3.5 pt-3">
                            <p className="whitespace-pre-line text-[13px] font-bold leading-relaxed text-foreground">
                              {item.question}
                            </p>
                            <div className="mt-3 rounded-xl border border-border/30 bg-background/60 p-3.5 dark:bg-background/10 shadow-sm">
                              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/60">
                                {t.answerQuestion}
                              </p>
                              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                                {item.answer || "—"}
                              </p>
                            </div>
                            {item.answer_coaching ? (
                              <p className="mt-3 whitespace-pre-line text-xs leading-relaxed text-muted-foreground/70 italic">
                                {item.answer_coaching}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {missedDailyFocusHistory.length > 0 ? (
        <section className="rounded-2xl border border-dashed border-border/40 bg-muted/[0.02] dark:bg-white/[0.02] overflow-hidden">
          <button
            type="button"
            onClick={() => setMissedHistoryOpen(!missedHistoryOpen)}
            className="w-full px-4 py-3 sm:px-5 text-start transition-colors hover:bg-muted/[0.04]"
          >
            <div className="flex items-center gap-2.5">
              <h4 className="text-[15px] font-extrabold text-muted-foreground/80 tracking-tight">
                {isArabic ? "أسئلة فاتتك" : "Missed Questions"}
              </h4>
              <span className="rounded-full border border-muted-foreground/15 bg-muted-foreground/[0.06] px-2.5 py-0.5 text-[10px] font-bold text-muted-foreground/60">
                {missedDailyFocusHistory.length}
              </span>
              <ChevronDown
                className={cn(
                  "ms-auto h-4 w-4 text-muted-foreground/40 transition-transform duration-200",
                  missedHistoryOpen && "rotate-180",
                )}
              />
            </div>
          </button>

          <div
            className="grid transition-[grid-template-rows] duration-200 ease-out-quart"
            style={{ gridTemplateRows: missedHistoryOpen ? "1fr" : "0fr" }}
          >
            <div className="overflow-hidden">
              <div className="border-t border-border/20 px-4 pb-4 pt-3 sm:px-5">
              <p className="text-[11px] leading-relaxed text-muted-foreground/50">
                {isArabic
                  ? "أيام ما جاوبت فيها على سؤال اليوم — فُرص تعمّق ضائعة."
                  : "Days you didn't answer the daily question — missed depth opportunities."}
              </p>

              <div className="mt-4 space-y-3">
                {missedDailyFocusHistory.map((item) => {
                  const itemKey = `${item.prompt_date}-${item.question}`;
                  const itemOpen = expandedMissedItem === itemKey;

                  return (
                    <article
                      key={itemKey}
                      className="overflow-hidden rounded-xl border border-dashed border-border/30 bg-muted/[0.02] dark:bg-white/[0.02]"
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedMissedItem(itemOpen ? null : itemKey)
                        }
                        className="w-full px-3.5 py-3 text-start transition-colors hover:bg-muted/[0.04]"
                      >
                        <div className="flex items-center gap-2.5 text-[11px] font-bold text-muted-foreground/50">
                          <span>{item.prompt_date}</span>
                          <span className="rounded-full border border-amber-500/15 bg-amber-500/[0.06] px-2 py-0.5 text-amber-600/80 dark:text-amber-400/70 text-[10px]">
                            {isArabic ? "فائت" : "Missed"}
                          </span>
                          <ChevronDown
                            className={cn(
                              "ms-auto h-4 w-4 transition-transform duration-200",
                              itemOpen && "rotate-180",
                            )}
                          />
                        </div>
                        <p className="mt-1.5 line-clamp-1 text-[13px] font-bold leading-snug text-muted-foreground/70">
                          {item.question}
                        </p>
                      </button>

                      <div
                        className="grid transition-[grid-template-rows] duration-200 ease-out-quart"
                        style={{ gridTemplateRows: itemOpen ? "1fr" : "0fr" }}
                      >
                        <div className="overflow-hidden">
                          <div className="border-t border-border/20 px-3.5 pb-3.5 pt-3">
                            <p className="whitespace-pre-line text-[13px] font-bold leading-relaxed text-muted-foreground/70">
                              {item.question}
                            </p>
                            <div className="mt-3 rounded-xl border border-dashed border-border/30 bg-muted/[0.02] p-3.5 dark:bg-white/[0.02]">
                              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/40">
                                {isArabic ? "لم يتم الإجابة" : "No answer given"}
                              </p>
                              <p className="mt-2 whitespace-pre-wrap text-xs italic leading-relaxed text-muted-foreground/50">
                                {isArabic
                                  ? "ما دزيت جواب لهذا السؤال."
                                  : "You didn't submit an answer for this question."}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
              </div>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
