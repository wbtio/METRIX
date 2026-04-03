'use client';

import { useState, type CSSProperties } from 'react';
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
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { translations, type Language } from '@/lib/translations';
import { getTaskAccent, type TaskColorKey } from '@/lib/task-colors';
import { type MainTask } from '@/lib/task-hierarchy';
import type { DailyFocusSession } from '@/lib/daily-focus';
import FullEmojiPicker from '../shared/FullEmojiPicker';
import TaskAppearancePicker from '../shared/TaskAppearancePicker';
import TaskColorPicker from '../shared/TaskColorPicker';
import DailyFocusPanel from './DailyFocusPanel';

interface FocusTabProps {
  language?: Language;
  isArabic: boolean;
  dailyFocus: DailyFocusSession | null;
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
  newMainFreq: 'daily' | 'weekly';
  newMainWeight: number;
  newMainColor: TaskColorKey | null;
  newMainAccent: ReturnType<typeof getTaskAccent>;
  newSubText: string;
  newSubFreq: 'daily' | 'weekly';
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
  onRetryDailyFocus: () => void;
  onAddDailyFocusSuggestion: (suggestionId: string) => void;
  onSetNewMainText: (text: string) => void;
  onSetNewMainFreq: (freq: 'daily' | 'weekly') => void;
  onSetNewMainWeight: (weight: number) => void;
  onSetNewMainColor: (color: TaskColorKey | null) => void;
  onSetNewSubText: (text: string) => void;
  onSetNewSubFreq: (freq: 'daily' | 'weekly') => void;
  onSetNewSubWeight: (weight: number) => void;
  onSetEditingText: (text: string) => void;
}

function hexToRgbChannels(hex: string) {
  const normalized = hex.replace('#', '');
  if (normalized.length !== 6) return '16, 185, 129';

  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);

  return `${red}, ${green}, ${blue}`;
}

export default function FocusTab({
  language = 'en',
  isArabic,
  dailyFocus,
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
  onRetryDailyFocus,
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
  const [focusSection, setFocusSection] = useState<'tasks' | 'suggestions'>('tasks');

  const sectionTabs = [
    { key: 'tasks' as const, label: t.focusTasksTab },
    { key: 'suggestions' as const, label: t.focusSuggestionsTab },
  ];

  return (
    <div className="pb-2 sm:pb-4">
      <section className="overflow-hidden rounded-3xl border border-border/70 bg-white/95 dark:bg-card/70">
        {/* Filter bar */}
        <div className="border-b border-border/60 px-3 py-3 sm:px-4">
          <div className="scrollbar-thin flex items-center gap-2 overflow-x-auto whitespace-nowrap">
            {sectionTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFocusSection(tab.key)}
                className={cn(
                  'inline-flex h-10 shrink-0 items-center gap-2 rounded-xl border px-3 text-xs font-semibold transition-all',
                  focusSection === tab.key
                    ? 'border-border/70 bg-white text-foreground shadow-sm dark:bg-background'
                    : 'border-border/60 bg-background/80 text-muted-foreground hover:text-foreground dark:bg-background/20',
                )}
              >
                <span>{tab.label}</span>
              </button>
            ))}
            <span className="inline-flex h-10 shrink-0 items-center gap-1 rounded-xl border border-cyan-600/20 bg-cyan-600/10 px-3 text-[11px] font-semibold text-cyan-700 dark:text-cyan-400">
              <CheckSquare className="h-3.5 w-3.5" />
              {focusStats.completedSubtasks}/{focusStats.totalSubtasks}
            </span>
            {focusSection === 'tasks' ? (
              <button
                onClick={addingMain ? onCloseNewMainComposer : onOpenNewMainComposer}
                className={cn(
                  'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xs font-bold transition-all',
                  addingMain
                    ? 'border border-primary/20 bg-primary/10 text-primary hover:bg-primary/15'
                    : 'bg-primary text-primary-foreground shadow-sm shadow-primary/15 hover:opacity-90',
                )}
                aria-label={addingMain ? (isArabic ? 'إلغاء' : 'Cancel') : (isArabic ? 'إضافة مهمة رئيسية' : 'Add main task')}
              >
                {addingMain ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              </button>
            ) : null}
          </div>
        </div>

        {/* Task list body */}
        <div className="px-3 py-3 sm:px-4 sm:py-4">
          {focusSection === 'suggestions' ? (
            <DailyFocusPanel
              language={language}
              isArabic={isArabic}
              dailyFocus={dailyFocus}
              loading={dailyFocusLoading}
              submitting={dailyFocusSubmitting}
              addingSuggestionId={dailyFocusAddingSuggestionId}
              error={dailyFocusError}
              answer={dailyFocusAnswer}
              onAnswerChange={onSetDailyFocusAnswer}
              onAnswerSubmit={onSubmitDailyFocusAnswer}
              onAppendTranscript={onAppendDailyFocusTranscript}
              onAddSuggestion={onAddDailyFocusSuggestion}
              onRetry={onRetryDailyFocus}
            />
          ) : loadingTasks ? (
            <div className="space-y-3">
              {[0, 1, 2].map((item) => (
                <div key={item} className="animate-pulse rounded-2xl border border-border/60 bg-muted/20 p-3.5">
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
            <div className="rounded-2xl border border-dashed border-border/70 bg-muted/[0.18] px-4 py-8 text-center sm:px-6">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <ListTodo className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-sm font-black text-foreground">
                {isArabic ? 'ابدأ أول مسار رئيسي لهذا الهدف' : 'Start the first main track for this goal'}
              </h3>
              <p className="mt-2 text-xs leading-6 text-muted-foreground sm:text-sm">
                {isArabic
                  ? 'أضف مساراً رئيسياً واضحاً ثم قسّمه إلى خطوات فرعية حتى تصبح المتابعة اليومية أسهل.'
                  : 'Add a clear main track, then break it into subtasks so the day-to-day follow-up feels lighter.'}
              </p>
              <button
                onClick={onOpenNewMainComposer}
                className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground shadow-md shadow-primary/20 transition-opacity hover:opacity-90"
              >
                <Plus className="h-4 w-4" />
                {isArabic ? 'إضافة مهمة رئيسية' : 'Add main task'}
              </button>
            </div>
          ) : (
            <div className={cn(
              'scrollbar-thin max-h-[clamp(18rem,56dvh,38rem)] overflow-y-auto space-y-3 overscroll-contain',
              isArabic ? 'pl-1' : 'pr-1',
            )}>
              {filteredHierarchy.map((main) => {
                const isExpanded = expandedMains.has(main.id);
                const completedSubs = main.subtasks.filter((sub) => isChecked(sub.id, sub.frequency)).length;
                const totalSubs = main.subtasks.length;
                const mainCompletion = totalSubs > 0 ? Math.round((completedSubs / totalSubs) * 100) : 0;
                const mainAccent = getTaskAccent(main.id, main.accent_color);
                const composerVisible = addingSubFor === main.id;
                const accentRgb = hexToRgbChannels(mainAccent.fill);
                const mainCompletedToday = isCompletedToday(main.id) || main.subtasks.some((sub) => isCompletedToday(sub.id));
                const mainShouldAnimate = shouldAnimateTask(main.id) || main.subtasks.some((sub) => shouldAnimateTask(sub.id));
                const completionStyle = mainCompletedToday
                  ? ({
                      '--focus-accent-rgb': accentRgb,
                      boxShadow: `0 0 0 1px rgba(${accentRgb}, 0.16), 0 18px 32px -26px rgba(${accentRgb}, 0.48)`,
                    } as CSSProperties)
                  : undefined;

                return (
                  <div
                    key={main.id}
                    className={cn(
                      'group/main overflow-hidden rounded-2xl border bg-white transition-[transform,box-shadow,border-color,background-color] duration-300 dark:bg-card/50',
                      mainAccent.borderClass,
                      mainCompletedToday && 'focus-task-completed-today',
                    )}
                    data-fresh={mainShouldAnimate ? 'true' : undefined}
                    style={completionStyle}
                  >
                    <div className="px-2.5 py-[9.5px] sm:px-3 sm:py-[9.5px]">
                      <div className="flex flex-col gap-2.5">
                        {/* Main task row */}
                        <div className={cn(
                          'gap-2',
                          editingTaskId === main.id ? 'flex flex-col' : 'flex items-center gap-2',
                        )}>
                          <div className="flex min-w-0 flex-1 items-center gap-2.5">
                            {editingTaskId === main.id ? (
                              <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border text-sm', mainAccent.softClass, mainAccent.borderClass)}>
                                <span>{main.icon || '📝'}</span>
                              </div>
                            ) : (
                              <TaskAppearancePicker
                                value={main.accent_color}
                                seed={main.id}
                                currentEmoji={main.icon || '📝'}
                                language={language}
                                onEmojiSelect={(icon) => onUpdateTaskIcon(main.id, icon)}
                                onColorSelect={(color) => onUpdateTaskColor(main.id, color)}
                              >
                                <button
                                  className={cn(
                                    'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border text-sm transition-colors hover:bg-muted/40',
                                    mainAccent.softClass,
                                    mainAccent.borderClass,
                                  )}
                                  title={isArabic ? 'تعديل المظهر' : 'Edit appearance'}
                                >
                                  {main.icon || '📝'}
                                </button>
                              </TaskAppearancePicker>
                            )}

                            <div className="min-w-0 flex-1 self-center">
                              {editingTaskId === main.id ? (
                                <div className="space-y-2">
                                  <input
                                    value={editingText}
                                    onChange={(e) => onSetEditingText(e.target.value)}
                                    className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
                                    autoFocus
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') onRenameTask(main.id);
                                      if (e.key === 'Escape') onCancelEditingTask();
                                    }}
                                  />
                                  <div className="flex flex-wrap items-center gap-2">
                                    <button
                                      onClick={() => onRenameTask(main.id)}
                                      className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground"
                                    >
                                      <Save className="h-3.5 w-3.5" />
                                      {isArabic ? 'حفظ' : 'Save'}
                                    </button>
                                    <button
                                      onClick={onCancelEditingTask}
                                      className="inline-flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-xs font-semibold text-muted-foreground"
                                    >
                                      <X className="h-3.5 w-3.5" />
                                      {t.cancel}
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="scrollbar-thin flex min-h-9 items-center gap-2 overflow-x-auto whitespace-nowrap">
                                  <span className="truncate text-sm font-black leading-none text-foreground">
                                    {main.task_description}
                                  </span>
                                  {mainCompletedToday && (
                                    <span
                                      className={cn(
                                        'focus-task-completed-pill inline-flex h-7 shrink-0 items-center gap-1 rounded-full border px-2.5 text-[10px] font-black',
                                        mainAccent.softClass,
                                        mainAccent.borderClass,
                                        mainAccent.textClass,
                                      )}
                                      data-fresh={mainShouldAnimate ? 'true' : undefined}
                                    >
                                      <CheckSquare className="h-3.5 w-3.5" />
                                      {t.completedToday}
                                    </span>
                                  )}
                                  {totalSubs > 0 && (
                                    <span className="inline-flex h-7 shrink-0 items-center gap-1 rounded-full bg-muted px-2 text-[10px] font-bold text-muted-foreground">
                                      {completedSubs}/{totalSubs}
                                    </span>
                                  )}
                                  {totalSubs > 0 && (
                                    <>
                                      <span className="inline-flex h-7 shrink-0 items-center gap-1 rounded-full border border-border/60 bg-background/80 px-2 text-[10px] font-semibold text-muted-foreground dark:bg-background/20">
                                        {isArabic ? `${mainCompletion}% إنجاز` : `${mainCompletion}% complete`}
                                      </span>
                                      <div className="h-1.5 w-16 shrink-0 overflow-hidden rounded-full bg-muted/70">
                                        <div
                                          className={cn('h-full rounded-full transition-all duration-500', mainAccent.swatchClass)}
                                          style={{ width: `${Math.max(mainCompletion, completedSubs > 0 ? 10 : 0)}%` }}
                                        />
                                      </div>
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>

                          {editingTaskId !== main.id && (
                            <div className="ms-auto flex shrink-0 items-center gap-1.5 ps-1">
                              <button
                                onClick={() => onToggleExpand(main.id)}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border/60 bg-background/80 text-muted-foreground transition-colors hover:text-foreground dark:bg-background/20"
                                title={isExpanded ? (isArabic ? 'طي' : 'Collapse') : (isArabic ? 'تفاصيل' : 'Details')}
                              >
                                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                              </button>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <button
                                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border/60 bg-background/80 text-muted-foreground transition-colors hover:text-foreground dark:bg-background/20"
                                    title={isArabic ? 'المزيد' : 'More'}
                                  >
                                    <MoreVertical className="h-4 w-4" />
                                  </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align={isArabic ? 'start' : 'end'} className="w-48">
                                  <DropdownMenuItem onClick={() => onStartAddingSub(main.id)} className="cursor-pointer">
                                    <Plus className="h-4 w-4" />
                                    <span>{isArabic ? 'إضافة مهمة فرعية' : 'Add subtask'}</span>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => onStartEditingTask(main.id, main.task_description)} className="cursor-pointer">
                                    <Edit2 className="h-4 w-4" />
                                    <span>{t.renameTask}</span>
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                                    {isArabic ? 'الوزن:' : 'Weight:'}
                                  </div>
                                  <div className="flex gap-1 px-2 pb-1">
                                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((w) => (
                                      <button
                                        key={w}
                                        onClick={() => onUpdateTaskWeight(main.id, w)}
                                        className={cn(
                                          'h-7 w-7 rounded-lg text-xs font-bold transition-colors',
                                          main.impact_weight === w
                                            ? 'bg-primary text-primary-foreground'
                                            : 'bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground'
                                        )}
                                      >
                                        {w}
                                      </button>
                                    ))}
                                  </div>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => onDeleteTask(main.id)} variant="destructive" className="cursor-pointer">
                                    <Trash2 className="h-4 w-4" />
                                    <span>{t.deleteTask}</span>
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          )}
                        </div>

                        {/* Expanded subtasks panel */}
                        {isExpanded && (
                          <div className="rounded-2xl border border-border/60 bg-muted/[0.14] p-3 dark:bg-background/20">
                            <div className="mb-3 flex flex-wrap items-center gap-2">
                              <span className={cn(
                                'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold',
                                main.frequency === 'daily'
                                  ? 'bg-cyan-600/10 text-cyan-700 dark:text-cyan-400'
                                  : 'bg-violet-500/10 text-violet-600 dark:text-violet-300',
                              )}>
                                {main.frequency === 'daily' ? (isArabic ? 'يومي' : 'Daily') : (isArabic ? 'أسبوعي' : 'Weekly')}
                              </span>
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-1 text-[10px] font-bold text-amber-600 dark:text-amber-300">
                                <Weight className="h-3 w-3" />
                                {main.impact_weight}
                              </span>
                              {totalSubs > 0 && (
                                <span className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-background/80 px-2.5 py-1 text-[10px] font-semibold text-muted-foreground dark:bg-background/20">
                                  {completedSubs}/{totalSubs}
                                </span>
                              )}
                            </div>

                            {main.subtasks.length > 0 ? (
                              <div className="space-y-2">
                                {main.subtasks.map((sub) => {
                                  const checked = isChecked(sub.id, sub.frequency);
                                  const completedToday = isCompletedToday(sub.id);
                                  const animateCompletion = shouldAnimateTask(sub.id);
                                  const subCompletionStyle = completedToday
                                    ? ({
                                        '--focus-accent-rgb': accentRgb,
                                        boxShadow: `0 14px 24px -24px rgba(${accentRgb}, 0.44)`,
                                      } as CSSProperties)
                                    : undefined;
                                  return (
                                    <div
                                      key={sub.id}
                                      className={cn(
                                        'flex flex-col gap-3 rounded-xl border px-3 py-2.5 transition-[transform,box-shadow,border-color,background-color] duration-300 sm:flex-row sm:items-center',
                                        checked
                                          ? cn(mainAccent.softClass, mainAccent.borderClass)
                                          : 'border-border/60 bg-background/80 dark:bg-background/25',
                                        completedToday && 'focus-task-completed-today',
                                      )}
                                      data-fresh={animateCompletion ? 'true' : undefined}
                                      style={subCompletionStyle}
                                    >
                                      <button
                                        onClick={() => onToggleCheckin(sub.id, sub.frequency)}
                                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-background/80 transition-colors hover:bg-muted/40 dark:bg-background/30"
                                      >
                                        {checked ? (
                                          <CheckSquare className={cn('h-5 w-5', mainAccent.textClass)} />
                                        ) : (
                                          <Square className="h-5 w-5 text-muted-foreground/60" />
                                        )}
                                      </button>

                                      <div className="min-w-0 flex-1">
                                        {editingTaskId === sub.id ? (
                                          <div className="space-y-2">
                                            <input
                                              value={editingText}
                                              onChange={(e) => onSetEditingText(e.target.value)}
                                              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                                              autoFocus
                                              onKeyDown={(e) => {
                                                if (e.key === 'Enter') onRenameTask(sub.id);
                                                if (e.key === 'Escape') onCancelEditingTask();
                                              }}
                                            />
                                            <div className="flex flex-wrap items-center gap-2">
                                              <button
                                                onClick={() => onRenameTask(sub.id)}
                                                className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground"
                                              >
                                                <Save className="h-3.5 w-3.5" />
                                                {isArabic ? 'حفظ' : 'Save'}
                                              </button>
                                              <button
                                                onClick={onCancelEditingTask}
                                                className="inline-flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-xs font-semibold text-muted-foreground"
                                              >
                                                <X className="h-3.5 w-3.5" />
                                                {t.cancel}
                                              </button>
                                            </div>
                                          </div>
                                        ) : (
                                          <div className="flex items-center gap-2">
                                            <FullEmojiPicker onSelect={(icon) => onUpdateTaskIcon(sub.id, icon)}>
                                              <button
                                                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-sm transition-colors hover:bg-muted/50"
                                                title={isArabic ? 'تغيير الأيقونة' : 'Change icon'}
                                              >
                                                {sub.icon || '🔹'}
                                              </button>
                                            </FullEmojiPicker>
                                            <span className={cn('text-sm font-semibold leading-6 text-foreground', checked && 'line-through text-muted-foreground')}>
                                              {sub.task_description}
                                            </span>
                                          </div>
                                        )}
                                      </div>

                                      <div className="flex flex-wrap items-center gap-1.5 sm:justify-end">
                                        {completedToday && (
                                          <span
                                            className={cn(
                                              'focus-task-completed-pill inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-bold',
                                              mainAccent.softClass,
                                              mainAccent.borderClass,
                                              mainAccent.textClass,
                                            )}
                                            data-fresh={animateCompletion ? 'true' : undefined}
                                          >
                                            <CheckSquare className="h-3 w-3" />
                                            {t.completedToday}
                                          </span>
                                        )}
                                        <span className={cn(
                                          'inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold',
                                          sub.frequency === 'daily'
                                            ? 'bg-cyan-600/10 text-cyan-700 dark:text-cyan-400'
                                            : 'bg-violet-500/10 text-violet-600 dark:text-violet-300',
                                        )}>
                                          {sub.frequency === 'daily' ? (isArabic ? 'يومي' : 'Daily') : (isArabic ? 'أسبوعي' : 'Weekly')}
                                        </span>
                                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-1 text-[10px] font-bold text-amber-600 dark:text-amber-300">
                                          <Weight className="h-3 w-3" />
                                          {sub.impact_weight}
                                        </span>
                                        {sub.time_required_minutes ? (
                                          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-[10px] font-semibold text-muted-foreground">
                                            <Clock className="h-3 w-3" />
                                            {sub.time_required_minutes}m
                                          </span>
                                        ) : null}

                                        {editingTaskId !== sub.id && (
                                          <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                              <button
                                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border/60 bg-background/80 text-muted-foreground transition-colors hover:text-foreground dark:bg-background/30"
                                                title={isArabic ? 'المزيد' : 'More'}
                                              >
                                                <MoreVertical className="h-4 w-4" />
                                              </button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align={isArabic ? 'start' : 'end'} className="w-48">
                                              <DropdownMenuItem onClick={() => onStartEditingTask(sub.id, sub.task_description)} className="cursor-pointer">
                                                <Edit2 className="h-4 w-4" />
                                                <span>{t.renameTask}</span>
                                              </DropdownMenuItem>
                                              <DropdownMenuSeparator />
                                              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                                                {isArabic ? 'الوزن:' : 'Weight:'}
                                              </div>
                                              <div className="flex gap-1 px-2 pb-1">
                                                {[1, 2, 3, 4, 5].map((w) => (
                                                  <button
                                                    key={w}
                                                    onClick={() => onUpdateTaskWeight(sub.id, w)}
                                                    className={cn(
                                                      'h-7 w-7 rounded-lg text-xs font-bold transition-colors',
                                                      sub.impact_weight === w
                                                        ? 'bg-primary text-primary-foreground'
                                                        : 'bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground'
                                                    )}
                                                  >
                                                    {w}
                                                  </button>
                                                ))}
                                              </div>
                                              <DropdownMenuSeparator />
                                              <DropdownMenuItem onClick={() => onDeleteTask(sub.id)} variant="destructive" className="cursor-pointer">
                                                <Trash2 className="h-4 w-4" />
                                                <span>{t.deleteTask}</span>
                                              </DropdownMenuItem>
                                            </DropdownMenuContent>
                                          </DropdownMenu>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="flex flex-col gap-3 rounded-xl border border-dashed border-border/70 bg-background/70 px-4 py-4 text-center sm:flex-row sm:items-center sm:justify-between sm:text-left dark:bg-background/20">
                                <div className="space-y-1">
                                  <p className="text-sm font-semibold text-foreground">
                                    {isArabic ? 'هذا المسار يحتاج أول مهمة فرعية' : 'This track needs its first subtask'}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {isArabic
                                      ? 'أضف خطوة قصيرة حتى يبدأ المسار بشكل واضح.'
                                      : 'Add one short step to make the track actionable.'}
                                  </p>
                                </div>
                                <button
                                  onClick={() => onStartAddingSub(main.id)}
                                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground"
                                >
                                  <Plus className="h-4 w-4" />
                                  {isArabic ? 'إضافة أول خطوة' : 'Add first step'}
                                </button>
                              </div>
                            )}

                            {/* Add subtask composer */}
                            {composerVisible && (
                              <div className={cn('mt-3 rounded-xl border border-dashed p-3', mainAccent.softClass, mainAccent.borderClass)}>
                                <div className="flex items-center gap-2 text-[11px] font-semibold text-muted-foreground">
                                  <span className={cn('h-2.5 w-2.5 rounded-full', mainAccent.swatchClass)} />
                                  <span>{isArabic ? 'أضف خطوة سريعة داخل هذا المسار' : 'Add a quick step inside this track'}</span>
                                </div>
                                <input
                                  value={newSubText}
                                  onChange={(e) => onSetNewSubText(e.target.value)}
                                  placeholder={isArabic ? 'مهمة فرعية جديدة...' : 'New subtask...'}
                                  className="mt-3 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
                                  autoFocus
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') onAddSub(main.id);
                                    if (e.key === 'Escape') onCancelAddingSub();
                                  }}
                                />
                                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                                  <select
                                    value={newSubFreq}
                                    onChange={(e) => onSetNewSubFreq(e.target.value as 'daily' | 'weekly')}
                                    className="flex-1 rounded-xl border border-border bg-background px-3 py-2.5 text-xs sm:text-sm"
                                  >
                                    <option value="daily">{isArabic ? 'يومي' : 'Daily'}</option>
                                    <option value="weekly">{isArabic ? 'أسبوعي' : 'Weekly'}</option>
                                  </select>
                                  <input
                                    type="number"
                                    min={1}
                                    max={5}
                                    value={newSubWeight}
                                    onChange={(e) => onSetNewSubWeight(Number(e.target.value) || 1)}
                                    className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-center text-xs sm:w-24 sm:text-sm"
                                    title={isArabic ? 'الوزن' : 'Weight'}
                                  />
                                  <button
                                    onClick={() => onAddSub(main.id)}
                                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground"
                                  >
                                    <Save className="h-4 w-4" />
                                    {isArabic ? 'حفظ' : 'Save'}
                                  </button>
                                  <button
                                    onClick={onCancelAddingSub}
                                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-muted px-4 py-2.5 text-sm font-semibold text-muted-foreground"
                                  >
                                    <X className="h-4 w-4" />
                                    {t.cancel}
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Add main task composer */}
        {addingMain && (
          <div className="border-t border-border/60 px-3 py-3 sm:px-4 sm:py-4">
            <div className="rounded-2xl border border-dashed border-primary/35 bg-primary/[0.05] p-3.5 sm:p-4">
              <div className="space-y-3">
                <div>
                  <h3 className="text-sm font-black text-foreground">
                    {isArabic ? 'أضف مساراً رئيسياً جديداً' : 'Add a new main track'}
                  </h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {isArabic ? 'اسم واضح مع تكرار ووزن مناسب.' : 'A clear title with the right cadence and weight.'}
                  </p>
                </div>

                <input
                  value={newMainText}
                  onChange={(e) => onSetNewMainText(e.target.value)}
                  placeholder={isArabic ? 'مهمة رئيسية جديدة...' : 'New main task...'}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') onAddMain();
                    if (e.key === 'Escape') onCloseNewMainComposer();
                  }}
                />

                <div className={cn(
                  'flex items-start gap-2 rounded-xl border px-3 py-2.5 text-xs font-semibold',
                  newMainAccent.softClass,
                  newMainAccent.borderClass,
                  newMainAccent.textClass,
                )}>
                  <span className={cn('mt-0.5 h-2.5 w-2.5 rounded-full', newMainAccent.swatchClass)} />
                  <span>
                    {newMainColor
                      ? (isArabic ? 'هذا اللون سينحفظ مع المسار الرئيسي ويظل ظاهراً في التحليلات.' : 'This color will be saved with the main track and stay visible in analytics.')
                      : (isArabic ? 'سيتم اختيار لون تلقائي يحافظ على تميّز هذا المسار داخل اللوحة.' : 'An automatic accent will keep this track visually distinct inside the board.')}
                  </span>
                </div>

                <TaskColorPicker
                  value={newMainColor}
                  seed={newMainText.trim() || 'main-task-preview'}
                  language={language}
                  onSelect={onSetNewMainColor}
                >
                  <button
                    type="button"
                    className={cn(
                      'flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-sm transition-colors hover:bg-muted/20',
                      newMainAccent.softClass,
                      newMainAccent.borderClass,
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <span className={cn('h-3 w-3 rounded-full', newMainAccent.swatchClass)} />
                      <span className="font-semibold text-foreground">
                        {isArabic ? 'اختيار لون المسار الرئيسي' : 'Choose main track color'}
                      </span>
                    </span>
                    <span className={cn('flex items-center gap-1 text-xs font-bold', newMainAccent.textClass)}>
                      <Palette className="h-3.5 w-3.5" />
                      {newMainColor ? (isArabic ? 'لون محفوظ' : 'Saved color') : (isArabic ? 'تلقائي' : 'Auto')}
                    </span>
                  </button>
                </TaskColorPicker>

                <div className="flex flex-col gap-2 sm:flex-row">
                  <select
                    value={newMainFreq}
                    onChange={(e) => onSetNewMainFreq(e.target.value as 'daily' | 'weekly')}
                    className="flex-1 rounded-xl border border-border bg-background px-3 py-2.5 text-xs sm:text-sm"
                  >
                    <option value="daily">{isArabic ? 'يومي' : 'Daily'}</option>
                    <option value="weekly">{isArabic ? 'أسبوعي' : 'Weekly'}</option>
                  </select>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={newMainWeight}
                    onChange={(e) => onSetNewMainWeight(Number(e.target.value) || 1)}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-center text-xs sm:w-28 sm:text-sm"
                    title={isArabic ? 'الوزن (1-10)' : 'Weight (1-10)'}
                  />
                  <button
                    onClick={onAddMain}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground"
                  >
                    <Save className="h-4 w-4" />
                    {isArabic ? 'حفظ' : 'Save'}
                  </button>
                  <button
                    onClick={onCloseNewMainComposer}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-muted px-4 py-2.5 text-sm font-semibold text-muted-foreground"
                  >
                    <X className="h-4 w-4" />
                    {t.cancel}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
