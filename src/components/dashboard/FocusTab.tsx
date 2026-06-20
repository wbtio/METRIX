"use client";

import { useState, type CSSProperties } from "react";
import {
  CheckSquare,
  Square,
  Plus,
  Trash2,
  Edit2,
  Save,
  X,
  Clock,
  Weight,
  ListTodo,
  MoreVertical,
  Palette,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { translations, type Language } from "@/lib/translations";
import { getTaskAccent, type TaskColorKey } from "@/lib/task-colors";
import { type MainTask } from "@/lib/task-hierarchy";
import type {
  DailyFocusHistoryItem,
  DailyFocusSession,
} from "@/lib/daily-focus";
import FullEmojiPicker from "../shared/FullEmojiPicker";
import TaskAppearancePicker from "../shared/TaskAppearancePicker";
import TaskColorPicker from "../shared/TaskColorPicker";
import DailyFocusPanel from "./DailyFocusPanel";

interface FocusTabProps {
  language?: Language;
  isArabic: boolean;
  dailyFocus: DailyFocusSession | null;
  dailyFocusHistory?: DailyFocusHistoryItem[];
  missedDailyFocusHistory?: DailyFocusHistoryItem[];
  dailyFocusLoading: boolean;
  dailyFocusSubmitting: boolean;
  dailyFocusAddingSuggestionId: string | null;
  dailyFocusError: string | null;
  dailyFocusAnswer: string;
  filteredHierarchy: MainTask[];
  hierarchy: MainTask[];
  loadingTasks: boolean;
  focusStats: { totalSubtasks: number; completedSubtasks: number };
  expandedMains: Set<string>;
  addingMain: boolean;
  addingSubFor: string | null;
  newMainText: string;
  newMainFreq: "daily" | "weekly";
  newMainWeight: number;
  newMainColor: TaskColorKey | null;
  newMainAccent: ReturnType<typeof getTaskAccent>;
  newSubText: string;
  newSubFreq: "daily" | "weekly";
  newSubWeight: number;
  editingTaskId: string | null;
  editingText: string;
  isChecked: (taskId: string, frequency: string) => boolean;
  isCompletedToday: (taskId: string) => boolean;
  shouldAnimateTask: (taskId: string) => boolean;
  onToggleExpand: (mainId: string) => void;
  onToggleCheckin: (taskId: string, frequency: string) => void;
  onOpenNewMainComposer: () => void;
  onCloseNewMainComposer: () => void;
  onAddMain: () => void;
  onStartAddingSub: (mainId: string) => void;
  onCancelAddingSub: () => void;
  onAddSub: (parentId: string) => void;
  onStartEditingTask: (taskId: string, description: string) => void;
  onCancelEditingTask: () => void;
  onRenameTask: (taskId: string) => void;
  onDeleteTask: (taskId: string) => void;
  onUpdateTaskIcon: (taskId: string, icon: string) => void;
  onUpdateTaskColor: (taskId: string, color: TaskColorKey | null) => void;
  onUpdateTaskWeight: (taskId: string, weight: number) => void;
  onSetDailyFocusAnswer: (text: string) => void;
  onAppendDailyFocusTranscript: (text: string) => void;
  onSubmitDailyFocusAnswer: () => void;
  onAddDailyFocusSuggestion: (suggestionId: string) => void;
  onSetNewMainText: (text: string) => void;
  onSetNewMainFreq: (freq: "daily" | "weekly") => void;
  onSetNewMainWeight: (weight: number) => void;
  onSetNewMainColor: (color: TaskColorKey | null) => void;
  onSetNewSubText: (text: string) => void;
  onSetNewSubFreq: (freq: "daily" | "weekly") => void;
  onSetNewSubWeight: (weight: number) => void;
  onSetEditingText: (text: string) => void;
}

function hexToRgbChannels(hex: string) {
  const normalized = hex.replace("#", "");
  if (normalized.length !== 6) return "16, 185, 129";

  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);

  return `${red}, ${green}, ${blue}`;
}

export default function FocusTab({
  language = "en",
  isArabic,
  dailyFocus,
  dailyFocusHistory = [],
  missedDailyFocusHistory = [],
  dailyFocusLoading,
  dailyFocusSubmitting,
  dailyFocusAddingSuggestionId,
  dailyFocusError,
  dailyFocusAnswer,
  filteredHierarchy,
  hierarchy,
  loadingTasks,
  focusStats,
  expandedMains,
  addingMain,
  addingSubFor,
  newMainText,
  newMainFreq,
  newMainWeight,
  newMainColor,
  newMainAccent,
  newSubText,
  newSubFreq,
  newSubWeight,
  editingTaskId,
  editingText,
  isChecked,
  isCompletedToday,
  shouldAnimateTask,
  onToggleExpand,
  onToggleCheckin,
  onOpenNewMainComposer,
  onCloseNewMainComposer,
  onAddMain,
  onStartAddingSub,
  onCancelAddingSub,
  onAddSub,
  onStartEditingTask,
  onCancelEditingTask,
  onRenameTask,
  onDeleteTask,
  onUpdateTaskIcon,
  onUpdateTaskColor,
  onUpdateTaskWeight,
  onSetDailyFocusAnswer,
  onAppendDailyFocusTranscript,
  onSubmitDailyFocusAnswer,
  onAddDailyFocusSuggestion,
  onSetNewMainText,
  onSetNewMainFreq,
  onSetNewMainWeight,
  onSetNewMainColor,
  onSetNewSubText,
  onSetNewSubFreq,
  onSetNewSubWeight,
  onSetEditingText,
}: FocusTabProps) {
  const t = translations[language];
  const [focusSection, setFocusSection] = useState<"tasks" | "suggestions">(
    "tasks",
  );

  const sectionTabs = [
    { key: "tasks" as const, label: t.focusTasksTab },
    { key: "suggestions" as const, label: t.focusSuggestionsTab },
  ];

  return (
    <div className="flex h-full min-h-0 flex-col pb-0">
      <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm shadow-black/[0.02] dark:bg-card/50">
        {/* Filter bar */}
        <div className="shrink-0 border-b border-border/50 bg-muted/[0.03] px-4 py-3 sm:px-5">
          <div className="scrollbar-thin flex items-center gap-2.5 overflow-x-auto whitespace-nowrap">
            {sectionTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFocusSection(tab.key)}
                className={cn(
                  "inline-flex h-9 shrink-0 items-center gap-2 rounded-xl border px-4 text-xs font-bold transition-all duration-200 active:scale-95",
                  focusSection === tab.key
                    ? "border-primary/25 bg-primary/[0.1] text-foreground shadow-sm shadow-primary/5 ring-1 ring-primary/10 dark:bg-primary/[0.16]"
                    : "border-transparent bg-transparent text-muted-foreground hover:bg-background/70 hover:text-foreground hover:border-border/40 hover:shadow-sm",
                )}
              >
                <span>{tab.label}</span>
              </button>
            ))}
            <span className="ms-1 inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl border border-cyan-500/20 bg-cyan-500/[0.08] px-3.5 text-[11px] font-bold text-cyan-700 dark:text-cyan-400 shadow-sm shadow-cyan-500/5">
              <CheckSquare className="h-4 w-4" />
              {focusStats.completedSubtasks}/{focusStats.totalSubtasks}
            </span>
            {focusSection === "tasks" ? (
              <button
                onClick={
                  addingMain ? onCloseNewMainComposer : onOpenNewMainComposer
                }
                className={cn(
                  "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-bold transition-all duration-200 active:scale-95 hover:shadow-md",
                  addingMain
                    ? "border border-primary/20 bg-primary/10 text-primary hover:bg-primary/15 hover:border-primary/30"
                    : "bg-primary text-primary-foreground shadow-sm shadow-primary/15 hover:opacity-90 hover:-translate-y-px",
                )}
                aria-label={
                  addingMain
                    ? isArabic
                      ? "إلغاء"
                      : "Cancel"
                    : isArabic
                      ? "إضافة مهمة رئيسية"
                      : "Add main task"
                }
              >
                {addingMain ? (
                  <X className="h-4 w-4" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
              </button>
            ) : null}
          </div>
        </div>

        {/* Task list body */}
        <div className="flex min-h-0 flex-1 flex-col px-3 py-3 sm:px-4 sm:py-4">
          {focusSection === "suggestions" ? (
            <div className="scrollbar-hide min-h-0 flex-1 overflow-y-auto overscroll-contain">
              <DailyFocusPanel
                language={language}
                isArabic={isArabic}
                dailyFocus={dailyFocus}
                dailyFocusHistory={dailyFocusHistory}
                missedDailyFocusHistory={missedDailyFocusHistory}
                loading={dailyFocusLoading}
                submitting={dailyFocusSubmitting}
                addingSuggestionId={dailyFocusAddingSuggestionId}
                error={dailyFocusError}
                answer={dailyFocusAnswer}
                onAnswerChange={onSetDailyFocusAnswer}
                onAnswerSubmit={onSubmitDailyFocusAnswer}
                onAppendTranscript={onAppendDailyFocusTranscript}
                onAddSuggestion={onAddDailyFocusSuggestion}
              />
            </div>
          ) : loadingTasks ? (
            <div className="scrollbar-thin min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain pb-6 sm:pb-2">
              {[0, 1, 2].map((item) => (
                <div
                  key={item}
                  className="animate-pulse rounded-xl border border-border/60 bg-muted/20 p-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-muted" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 w-28 rounded-full bg-muted" />
                      <div className="h-3 w-2/3 rounded-full bg-muted/80" />
                    </div>
                    <div className="h-8 w-20 rounded-xl bg-muted" />
                  </div>
                  <div className="mt-3 h-12 rounded-xl bg-muted/70" />
                </div>
              ))}
            </div>
          ) : hierarchy.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/40 bg-muted/[0.03] px-4 py-10 text-center sm:px-6">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/[0.07] text-primary ring-1 ring-primary/10 shadow-sm shadow-primary/5">
                <ListTodo className="h-6 w-6" />
              </div>
              <h3 className="mt-5 text-[15px] font-extrabold tracking-tight text-foreground">
                {isArabic
                  ? "ابدأ أول مسار رئيسي لهذا الهدف"
                  : "Start the first main track for this goal"}
              </h3>
              <p className="mt-2.5 text-xs leading-relaxed text-muted-foreground/80 sm:text-sm max-w-xs mx-auto">
                {isArabic
                  ? "أضف مساراً رئيسياً واضحاً ثم قسّمه إلى خطوات فرعية حتى تصبح المتابعة اليومية أسهل."
                  : "Add a clear main track, then break it into subtasks so the day-to-day follow-up feels lighter."}
              </p>
              <button
                onClick={onOpenNewMainComposer}
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground shadow-md shadow-primary/15 transition-all duration-200 hover:opacity-90 hover:-translate-y-px hover:shadow-lg active:scale-[0.98]"
              >
                <Plus className="h-4 w-4" />
                {isArabic ? "إضافة مهمة رئيسية" : "Add main task"}
              </button>
            </div>
          ) : (
            <div
              className={cn(
                "scrollbar-thin min-h-0 flex-1 space-y-3.5 overflow-y-auto overscroll-contain pb-6 sm:pb-3",
                isArabic ? "pl-1" : "pr-1",
              )}
            >
              {filteredHierarchy.map((main) => {
                const isExpanded = expandedMains.has(main.id);
                const completedSubs = main.subtasks.filter((sub) =>
                  isChecked(sub.id, sub.frequency),
                ).length;
                const totalSubs = main.subtasks.length;
                const mainCompletion =
                  totalSubs > 0
                    ? Math.round((completedSubs / totalSubs) * 100)
                    : 0;
                const mainAccent = getTaskAccent(main.id, main.accent_color);
                const composerVisible = addingSubFor === main.id;
                const accentRgb = hexToRgbChannels(mainAccent.fill);
                const mainCompletedToday =
                  isCompletedToday(main.id) ||
                  main.subtasks.some((sub) => isCompletedToday(sub.id));
                const mainShouldAnimate =
                  shouldAnimateTask(main.id) ||
                  main.subtasks.some((sub) => shouldAnimateTask(sub.id));
                const completionStyle = mainCompletedToday
                  ? ({
                      "--focus-accent-rgb": accentRgb,
                      boxShadow: `0 0 0 1px rgba(${accentRgb}, 0.16), 0 18px 32px -26px rgba(${accentRgb}, 0.48)`,
                    } as CSSProperties)
                  : undefined;

                return (
                  <div
                    key={main.id}
                    className={cn(
                      "group/main overflow-hidden rounded-2xl border border-border/50 bg-card shadow-[0_1px_3px_-1px_rgba(0,0,0,0.03)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md dark:bg-card/50 dark:shadow-[0_1px_3px_-1px_rgba(0,0,0,0.15)]",
                      mainAccent.borderClass,
                      mainCompletedToday && "focus-task-completed-today",
                    )}
                    data-fresh={mainShouldAnimate ? "true" : undefined}
                    style={completionStyle}
                  >
                    <div className="px-2.5 py-1.5 sm:px-3 sm:py-2">
                      <div className="flex flex-col gap-3">
                        {/* Main task row */}
                        <div
                          className={cn(
                            "gap-2",
                            editingTaskId === main.id
                              ? "flex flex-col"
                              : "flex items-center gap-1.5 sm:gap-2",
                          )}
                        >
                          <div className="flex min-w-0 flex-1 items-center gap-3">
                            {editingTaskId === main.id ? (
                              <div
                                className={cn(
                                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border text-sm shadow-sm",
                                  mainAccent.softClass,
                                  mainAccent.borderClass,
                                )}
                              >
                                <span>{main.icon || "📝"}</span>
                              </div>
                            ) : (
                              <TaskAppearancePicker
                                value={main.accent_color}
                                seed={main.id}
                                currentEmoji={main.icon || "📝"}
                                language={language}
                                onEmojiSelect={(icon) =>
                                  onUpdateTaskIcon(main.id, icon)
                                }
                                onColorSelect={(color) =>
                                  onUpdateTaskColor(main.id, color)
                                }
                              >
                                <button
                                  className={cn(
                                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border text-sm transition-all duration-200 hover:bg-muted/50 hover:scale-105 active:scale-95 shadow-sm",
                                    mainAccent.softClass,
                                    mainAccent.borderClass,
                                  )}
                                  title={
                                    isArabic
                                      ? "تعديل المظهر"
                                      : "Edit appearance"
                                  }
                                >
                                  {main.icon || "📝"}
                                </button>
                              </TaskAppearancePicker>
                            )}

                            <div className="min-w-0 flex-1 self-center">
                              {editingTaskId === main.id ? (
                                <div className="space-y-2">
                                  <input
                                    value={editingText}
                                    onChange={(e) =>
                                      onSetEditingText(e.target.value)
                                    }
                                    className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
                                    autoFocus
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter")
                                        onRenameTask(main.id);
                                      if (e.key === "Escape")
                                        onCancelEditingTask();
                                    }}
                                  />
                                  <div className="flex flex-wrap items-center gap-2">
                                    <button
                                      onClick={() => onRenameTask(main.id)}
                                      className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground shadow-sm hover:opacity-90 active:scale-[0.98]"
                                    >
                                      <Save className="h-3.5 w-3.5" />
                                      {isArabic ? "حفظ" : "Save"}
                                    </button>
                                    <button
                                      onClick={onCancelEditingTask}
                                      className="inline-flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-xs font-semibold text-muted-foreground hover:opacity-90"
                                    >
                                      <X className="h-3.5 w-3.5" />
                                      {t.cancel}
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => onToggleExpand(main.id)}
                                  className="flex min-h-8 w-full min-w-0 items-center gap-2 rounded-lg text-start transition-colors hover:bg-muted/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 px-1 -mx-1"
                                  aria-expanded={isExpanded}
                                  title={main.task_description}
                                >
                                  {/* Task name — always visible, prominent */}
                                  <span
                                    className={cn(
                                      "line-clamp-2 min-w-0 flex-1 break-words text-xs font-extrabold leading-snug text-foreground sm:text-sm",
                                      mainCompletedToday &&
                                        "text-foreground/75",
                                    )}
                                  >
                                    {main.task_description}
                                  </span>

                                  {/* Inline meta — slim indicators always, full pills on hover (desktop) */}
                                  {totalSubs > 0 && (
                                    <div className="flex shrink-0 items-center gap-2">
                                      {/* Thin progress bar, always visible */}
                                      <div className="h-2 w-14 overflow-hidden rounded-full bg-muted/25 sm:w-20">
                                        <div
                                          className={cn(
                                            "h-full rounded-full transition-all duration-700 ease-out",
                                            mainAccent.swatchClass,
                                          )}
                                          style={{
                                            width: `${Math.max(mainCompletion, completedSubs !== 0 ? 10 : 0)}%`,
                                          }}
                                        />
                                      </div>
                                      {/* Detailed pills — appear on hover (desktop only) */}
                                      <div className="hidden items-center gap-1.5 overflow-hidden opacity-0 transition-opacity duration-200 group-hover/main:opacity-100 [@media(hover:hover)]:flex">
                                        <span className="inline-flex h-7 shrink-0 items-center gap-1 rounded-full bg-muted/50 px-2.5 text-[11px] font-bold text-muted-foreground border border-border/30">
                                          {completedSubs}/{totalSubs}
                                        </span>
                                        <span className="inline-flex h-7 shrink-0 items-center rounded-full border border-border/40 bg-background/80 px-2.5 text-[11px] font-semibold text-muted-foreground dark:bg-background/20">
                                          {isArabic
                                            ? `${mainCompletion}%`
                                            : `${mainCompletion}%`}
                                        </span>
                                      </div>
                                    </div>
                                  )}
                                </button>
                              )}
                            </div>
                          </div>

                          {editingTaskId !== main.id && (
                            <div
                              className={cn(
                                "ms-auto flex shrink-0 items-center gap-1 ps-0.5 sm:gap-1.5 sm:ps-1",
                                isArabic &&
                                  "flex-row-reverse ps-0 pe-0.5 sm:pe-1",
                              )}
                            >
                              <button
                                onClick={() => onToggleExpand(main.id)}
                                className={cn(
                                  "hidden h-8 w-8 items-center justify-center rounded-lg border border-border/50 bg-background/70 text-muted-foreground transition-all duration-200 hover:text-foreground hover:bg-muted/40 hover:border-border/70 active:scale-95 dark:bg-background/20 sm:inline-flex shadow-sm",
                                  isExpanded && "text-foreground bg-muted/50 border-border/60",
                                )}
                                title={
                                  isExpanded
                                    ? isArabic
                                      ? "طي"
                                      : "Collapse"
                                    : isArabic
                                      ? "تفاصيل"
                                      : "Details"
                                }
                                aria-expanded={isExpanded}
                              >
                                {isExpanded ? (
                                  <ChevronDown className="h-4 w-4" />
                                ) : (
                                  <ChevronRight className="h-4 w-4 rtl:rotate-180" />
                                )}
                              </button>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <button
                                    className={cn(
                                      "inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border/50 bg-background/70 text-muted-foreground transition-all duration-200 hover:text-foreground hover:bg-muted/40 hover:border-border/70 active:scale-95 dark:bg-background/20 shadow-sm",
                                      "opacity-100 pointer-events-auto",
                                    )}
                                    title={isArabic ? "المزيد" : "More"}
                                  >
                                    <MoreVertical className="h-4 w-4" />
                                  </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent
                                  align={isArabic ? "start" : "end"}
                                  className="w-48"
                                >
                                  <DropdownMenuItem
                                    onClick={() => onStartAddingSub(main.id)}
                                    className="cursor-pointer"
                                  >
                                    <Plus className="h-4 w-4" />
                                    <span>
                                      {isArabic
                                        ? "إضافة مهمة فرعية"
                                        : "Add subtask"}
                                    </span>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() =>
                                      onStartEditingTask(
                                        main.id,
                                        main.task_description,
                                      )
                                    }
                                    className="cursor-pointer"
                                  >
                                    <Edit2 className="h-4 w-4" />
                                    <span>{t.renameTask}</span>
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <div className="px-2.5 py-1.5 text-xs font-semibold text-muted-foreground">
                                    {isArabic ? "الوزن:" : "Weight:"}
                                  </div>
                                  <div className="scrollbar-thin flex gap-1 px-2 pb-1 overflow-x-auto">
                                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(
                                      (w) => (
                                        <button
                                          key={w}
                                          onClick={() =>
                                            onUpdateTaskWeight(main.id, w)
                                          }
                                          className={cn(
                                            "h-8 w-8 shrink-0 rounded-lg text-xs font-bold transition-colors",
                                            main.impact_weight === w
                                              ? "bg-primary text-primary-foreground shadow-sm"
                                              : "bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground",
                                          )}
                                        >
                                          {w}
                                        </button>
                                      ),
                                    )}
                                  </div>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => onDeleteTask(main.id)}
                                    variant="destructive"
                                    className="cursor-pointer"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                    <span>{t.deleteTask}</span>
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                              {mainCompletedToday && (
                                <span
                                  className={cn(
                                    "focus-task-completed-pill hidden h-7 shrink-0 items-center gap-1.5 rounded-full border px-2.5 text-[11px] font-bold opacity-0 transition-all duration-200 sm:inline-flex sm:pointer-events-none sm:group-hover/main:pointer-events-auto sm:group-hover/main:opacity-100 shadow-sm",
                                    mainAccent.softClass,
                                    mainAccent.borderClass,
                                    mainAccent.textClass,
                                  )}
                                  data-fresh={
                                    mainShouldAnimate ? "true" : undefined
                                  }
                                  title={t.completedToday}
                                >
                                  <CheckSquare className="h-3.5 w-3.5" />
                                  <span className="hidden sm:inline">{t.completedToday}</span>
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Expanded subtasks panel with grid transition */}
                        <div
                          className="grid transition-[grid-template-rows] duration-200 ease-out-quart"
                          style={{
                            gridTemplateRows: isExpanded ? "1fr" : "0fr"
                          }}
                        >
                          <div className="overflow-hidden">
                            <div className="pt-2">
                              <div className="rounded-2xl border border-border/50 bg-muted/[0.08] p-3 dark:bg-background/15 shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)]">
                            {main.subtasks.length > 0 ? (
                              <div className="space-y-2">
                                {main.subtasks.map((sub) => {
                                  const checked = isChecked(
                                    sub.id,
                                    sub.frequency,
                                  );
                                  const completedToday = isCompletedToday(
                                    sub.id,
                                  );
                                  const animateCompletion = shouldAnimateTask(
                                    sub.id,
                                  );
                                  const subCompletionStyle = completedToday
                                    ? ({
                                        "--focus-accent-rgb": accentRgb,
                                        boxShadow: `0 14px 24px -24px rgba(${accentRgb}, 0.44)`,
                                      } as CSSProperties)
                                    : undefined;
                                  return (
                                    <div
                                      key={sub.id}
                                      className={cn(
                                        "group/sub flex items-center gap-2 rounded-lg border px-2.5 py-1.5 transition-all duration-200 sm:gap-2.5 sm:px-3 sm:py-2",
                                        checked
                                          ? cn(
                                              mainAccent.softClass,
                                              mainAccent.borderClass,
                                              "shadow-sm",
                                            )
                                          : "border-border/50 bg-background/80 dark:bg-background/25 hover:border-border/70 hover:shadow-sm",
                                        completedToday &&
                                          "focus-task-completed-today",
                                      )}
                                      data-fresh={
                                        animateCompletion ? "true" : undefined
                                      }
                                      style={subCompletionStyle}
                                    >
                                      <button
                                        onClick={() =>
                                          onToggleCheckin(sub.id, sub.frequency)
                                        }
                                        className={cn(
                                          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition-all duration-200 active:scale-90",
                                          checked
                                            ? "border-transparent bg-primary/10 shadow-sm"
                                            : "border-border/50 bg-background/90 hover:bg-muted/40 dark:bg-background/40",
                                        )}
                                      >
                                        {checked ? (
                                          <CheckSquare
                                            className={cn(
                                              "h-4 w-4 transition-transform duration-200 animate-check-pop",
                                              mainAccent.textClass,
                                            )}
                                          />
                                        ) : (
                                          <Square className="h-4 w-4 text-muted-foreground/50 transition-all duration-150 active:scale-95" />
                                        )}
                                      </button>

                                      <div className="min-w-0 flex-1">
                                        {editingTaskId === sub.id ? (
                                          <div className="space-y-2">
                                            <input
                                              value={editingText}
                                              onChange={(e) =>
                                                onSetEditingText(e.target.value)
                                              }
                                              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm shadow-sm"
                                              autoFocus
                                              onKeyDown={(e) => {
                                                if (e.key === "Enter")
                                                  onRenameTask(sub.id);
                                                if (e.key === "Escape")
                                                  onCancelEditingTask();
                                              }}
                                            />
                                            <div className="flex flex-wrap items-center gap-2">
                                              <button
                                                onClick={() =>
                                                  onRenameTask(sub.id)
                                                }
                                                className="inline-flex items-center gap-2 rounded-xl bg-primary px-3 py-2 text-xs font-bold text-primary-foreground shadow-sm hover:opacity-90 active:scale-95 transition-all"
                                              >
                                                <Save className="h-3.5 w-3.5" />
                                                {isArabic ? "حفظ" : "Save"}
                                              </button>
                                              <button
                                                onClick={onCancelEditingTask}
                                                className="inline-flex items-center gap-2 rounded-xl bg-muted px-3 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted/70 active:scale-95 transition-all"
                                              >
                                                <X className="h-3.5 w-3.5" />
                                                {t.cancel}
                                              </button>
                                            </div>
                                          </div>
                                        ) : (
                                          <div className="flex min-w-0 items-center gap-2">
                                            <FullEmojiPicker
                                              value={sub.icon}
                                              language={language}
                                              onSelect={(icon) =>
                                                onUpdateTaskIcon(sub.id, icon)
                                              }
                                            >
                                              <button
                                                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-sm transition-all duration-200 hover:bg-muted/50 hover:scale-110 active:scale-90"
                                                title={
                                                  isArabic
                                                    ? "تغيير الأيقونة"
                                                    : "Change icon"
                                                }
                                              >
                                                {sub.icon || "🔹"}
                                              </button>
                                            </FullEmojiPicker>
                                            <span
                                              className={cn(
                                                "line-clamp-2 min-w-0 flex-1 break-words text-xs font-semibold leading-snug text-foreground sm:text-sm",
                                                checked &&
                                                  "line-through text-muted-foreground/60",
                                              )}
                                              title={sub.task_description}
                                            >
                                              {sub.task_description}
                                            </span>
                                          </div>
                                        )}
                                      </div>

                                      <div className="flex shrink-0 items-center gap-2">
                                        {/* Cadence dot — always visible, tiny */}
                                        <span
                                          className={cn(
                                            "h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-background",
                                            sub.frequency === "daily"
                                              ? "bg-cyan-500 shadow-sm shadow-cyan-500/30"
                                              : "bg-violet-500 shadow-sm shadow-violet-500/30",
                                          )}
                                          title={
                                            sub.frequency === "daily"
                                              ? isArabic
                                                ? "يومي"
                                                : "Daily"
                                              : isArabic
                                                ? "أسبوعي"
                                                : "Weekly"
                                          }
                                          aria-label={
                                            sub.frequency === "daily"
                                              ? isArabic
                                                ? "يومي"
                                                : "Daily"
                                              : isArabic
                                                ? "أسبوعي"
                                                : "Weekly"
                                          }
                                        />

                                        {/* Detailed pills — only on hover (desktop) */}
                                        <div className="hidden items-center gap-1.5 overflow-hidden opacity-0 transition-opacity duration-200 group-hover/sub:opacity-100 [@media(hover:hover)]:flex">
                                          {completedToday && (
                                            <span
                                              className={cn(
                                                "focus-task-completed-pill inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-bold shadow-sm",
                                                mainAccent.softClass,
                                                mainAccent.borderClass,
                                                mainAccent.textClass,
                                              )}
                                              data-fresh={
                                                animateCompletion
                                                  ? "true"
                                                  : undefined
                                              }
                                              title={t.completedToday}
                                            >
                                              <CheckSquare className="h-3.5 w-3.5" />
                                            </span>
                                          )}
                                          <span
                                            className={cn(
                                              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold border",
                                              sub.frequency === "daily"
                                                ? "bg-cyan-500/[0.08] text-cyan-700 dark:text-cyan-400 border-cyan-500/15"
                                                : "bg-violet-500/[0.08] text-violet-600 dark:text-violet-300 border-violet-500/15",
                                            )}
                                          >
                                            {sub.frequency === "daily"
                                              ? isArabic
                                                ? "يومي"
                                                : "Daily"
                                              : isArabic
                                                ? "أسبوعي"
                                                : "Weekly"}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="py-6 text-center text-xs text-muted-foreground/75">
                                {isArabic
                                  ? "لا توجد خطوات فرعية بعد. اضغط على \"+\" لإضافة خطوة."
                                  : "No subtasks yet. Click '+' in main task menu to add."}
                              </div>
                            )}

                            {/* Subtask composer inline */}
                            {composerVisible && (
                              <div className="mt-3 rounded-xl border border-dashed border-border/50 bg-background/50 p-3 dark:bg-background/10 animate-in fade-in slide-in-from-top-2 duration-200 ease-out-quart">
                                <div className="flex flex-col gap-2.5">
                                  <input
                                    placeholder={
                                      isArabic
                                        ? "أدخل وصف الخطوة الفرعية..."
                                        : "Enter subtask description..."
                                    }
                                    value={newSubText}
                                    onChange={(e) =>
                                      onSetNewSubText(e.target.value)
                                    }
                                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs"
                                    autoFocus
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter")
                                        onAddSub(main.id);
                                      if (e.key === "Escape")
                                        onCancelAddingSub();
                                    }}
                                  />
                                  <div className="flex flex-wrap items-center gap-2">
                                    <div className="flex rounded-lg border border-border bg-background p-0.5 text-[11px] font-semibold">
                                      <button
                                        onClick={() =>
                                          onSetNewSubFreq("daily")
                                        }
                                        className={cn(
                                          "rounded-md px-2 py-1 transition-colors",
                                          newSubFreq === "daily"
                                            ? "bg-primary text-primary-foreground shadow-sm"
                                            : "text-muted-foreground hover:text-foreground",
                                        )}
                                      >
                                        {isArabic ? "يومي" : "Daily"}
                                      </button>
                                      <button
                                        onClick={() =>
                                          onSetNewSubFreq("weekly")
                                        }
                                        className={cn(
                                          "rounded-md px-2 py-1 transition-colors",
                                          newSubFreq === "weekly"
                                            ? "bg-primary text-primary-foreground shadow-sm"
                                            : "text-muted-foreground hover:text-foreground",
                                        )}
                                      >
                                        {isArabic ? "أسبوعي" : "Weekly"}
                                      </button>
                                    </div>

                                    <button
                                      onClick={() => onAddSub(main.id)}
                                      className="ms-auto inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground shadow-sm hover:opacity-90 active:scale-[0.98]"
                                    >
                                      <Plus className="h-3.5 w-3.5" />
                                      {isArabic ? "إضافة" : "Add"}
                                    </button>
                                    <button
                                      onClick={onCancelAddingSub}
                                      className="inline-flex items-center gap-1.5 rounded-lg bg-muted px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:opacity-90"
                                    >
                                      <X className="h-3.5 w-3.5" />
                                      {t.cancel}
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Main Task Composer Inline */}
          {addingMain && (
            <div className="shrink-0 border-t border-border/50 bg-muted/[0.02] p-4 animate-in fade-in slide-in-from-bottom-5 duration-300 ease-out-quart">
              <div className="rounded-2xl border border-primary/20 bg-background/50 p-4 shadow-sm backdrop-blur-sm dark:bg-background/10">
                <div className="flex flex-col gap-3.5">
                  <input
                    placeholder={
                      isArabic
                        ? "ما هو المسار الرئيسي الجديد الذي تريد التركيز عليه؟"
                        : "What main track do you want to focus on?"
                    }
                    value={newMainText}
                    onChange={(e) => onSetNewMainText(e.target.value)}
                    className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") onAddMain();
                      if (e.key === "Escape") onCloseNewMainComposer();
                    }}
                  />

                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex rounded-lg border border-border bg-background p-0.5 text-[11px] font-bold">
                      <button
                        onClick={() => onSetNewMainFreq("daily")}
                        className={cn(
                          "rounded-md px-2.5 py-1.5 transition-colors",
                          newMainFreq === "daily"
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground",
                        )}
                      >
                        {isArabic ? "يومي" : "Daily"}
                      </button>
                      <button
                        onClick={() => onSetNewMainFreq("weekly")}
                        className={cn(
                          "rounded-md px-2.5 py-1.5 transition-colors",
                          newMainFreq === "weekly"
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground",
                        )}
                      >
                        {isArabic ? "أسبوعي" : "Weekly"}
                      </button>
                    </div>

                    <TaskColorPicker
                      value={newMainColor}
                      onSelect={onSetNewMainColor}
                      language={language}
                    >
                      <button
                        type="button"
                        className="inline-flex items-center gap-1.5 rounded-xl border border-border/60 bg-muted/30 px-3 py-2 text-xs font-semibold text-muted-foreground transition-all hover:bg-muted/50 hover:text-foreground"
                      >
                        <Palette className="h-3.5 w-3.5" />
                        {newMainColor ? (isArabic ? 'تغيير اللون' : 'Change Color') : (isArabic ? 'اختر لوناً' : 'Choose Color')}
                      </button>
                    </TaskColorPicker>

                    <button
                      onClick={onAddMain}
                      className="ms-auto inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground shadow-md shadow-primary/15 hover:opacity-90 active:scale-95 transition-all duration-200"
                    >
                      <Plus className="h-4 w-4" />
                      {isArabic ? "إضافة المسار" : "Add Track"}
                    </button>
                    <button
                      onClick={onCloseNewMainComposer}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-muted px-4 py-3 text-sm font-semibold text-muted-foreground hover:bg-muted/70 active:scale-95 transition-all duration-200"
                    >
                      <X className="h-4 w-4" />
                      {t.cancel}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
