'use client';

import { useState } from 'react';
import { Clock, Target, Trash2, MoreVertical, Pin, PinOff, Edit2, ListChecks, BarChart3 } from 'lucide-react';
import { translations, type Language } from '@/lib/translations';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { createClient } from '@/utils/supabase/client';
import type { GoalTaskStats } from '@/app/page';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getGoalEndDaysChip } from '@/lib/goal-dates';
import { getGoalIcon } from './IconPicker';
import GoalEditDialog from './GoalEditDialog';
import GoalProgressBar from '@/components/shared/GoalProgressBar';
import ConfirmModal from '@/components/shared/ConfirmModal';

interface Goal {
    id: string;
    title: string;
    current_points: number;
    target_points: number;
    status: string;
    created_at: string;
    estimated_completion_date?: string | null;
    total_days?: number;
    ai_summary?: string;
    icon?: string;
    is_pinned?: boolean;
}

interface GoalsListProps {
    goals: Goal[];
    taskStatsMap?: Record<string, GoalTaskStats>;
    selectedGoalId: string | null;
    onSelectGoal: (id: string) => void;
    onGoalChanged?: () => void;
    language?: Language;
}

export default function GoalsList({ goals, taskStatsMap = {}, selectedGoalId, onSelectGoal, onGoalChanged, language = 'en' }: GoalsListProps) {
    const t = translations[language];
    const isArabic = language === 'ar';
    const supabase = createClient();
    const [activeTab, setActiveTab] = useState<'goals' | 'statistics'>('goals');
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
    const [confirmDeleteGoal, setConfirmDeleteGoal] = useState<{ id: string; title: string } | null>(null);

    const handleDeleteGoal = async (goalId: string) => {
        setDeletingId(goalId);

        try {
            // Child tables are configured with ON DELETE CASCADE,
            // so deleting the goal automatically cleans up related records.
            const { error } = await supabase.from('goals').delete().eq('id', goalId);

            if (error) throw error;

            if (onGoalChanged) onGoalChanged();
        } catch (error: unknown) {
            console.error('Error deleting goal:', error);
            const message = error instanceof Error ? error.message : JSON.stringify(error);
            alert((language === 'ar' ? 'فشل حذف الهدف: ' : 'Failed to delete goal: ') + message);
        } finally {
            setDeletingId(null);
        }
    };

    const handleTogglePin = async (goal: Goal) => {
        try {
            const { error } = await supabase
                .from('goals')
                .update({ is_pinned: !goal.is_pinned })
                .eq('id', goal.id);

            if (error) throw error;
            if (onGoalChanged) onGoalChanged(); // Refresh list
        } catch (error) {
            console.error('Error toggling pin:', error);
        }
    };

    const openEditDialog = (goal: Goal) => {
        setEditingGoal(goal);
    };

    const isRTL = (text: string) => {
        const arabicRegex = /[\u0600-\u06ff]/;
        return arabicRegex.test(text);
    };

    if (goals.length === 0 && activeTab === 'goals') {
        return (
            <div className="w-full max-w-4xl 2xl:max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-500 flex-1 flex flex-col">
                <div className="bg-card/30 backdrop-blur-xl p-3 sm:p-4 rounded-[20px] sm:rounded-[28px] border border-border ring-1 ring-border/5 flex-1 flex flex-col min-h-0">
                    <div className="flex gap-1 mb-4 p-1 rounded-2xl bg-muted/40 border border-border/40">
                        <button
                            onClick={() => setActiveTab('goals')}
                            className={cn(
                                "flex flex-1 items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200",
                                activeTab === 'goals'
                                    ? "bg-background/80 text-foreground shadow-sm ring-1 ring-border/60"
                                    : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                            )}
                        >
                            <Target className="w-4 h-4" />
                            {t.myGoals}
                        </button>
                        <button
                            onClick={() => setActiveTab('statistics')}
                            className={cn(
                                "flex flex-1 items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200",
                                activeTab === 'statistics'
                                    ? "bg-background/80 text-foreground shadow-sm ring-1 ring-border/60"
                                    : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                            )}
                        >
                            <BarChart3 className="w-4 h-4" />
                            {t.goalsStatistics}
                        </button>
                    </div>

                    <div className="flex-1 min-h-0 flex items-center justify-center">
                        <div className="w-full text-center p-12 bg-muted/20 rounded-2xl border border-dashed border-border">
                            <Target className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                            <p className="text-muted-foreground font-medium text-lg">{t.noGoalsYet}</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full max-w-4xl 2xl:max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-500 flex-1 flex flex-col">
            <div className="bg-card/30 backdrop-blur-xl p-3 sm:p-4 rounded-[20px] sm:rounded-[28px] border border-border ring-1 ring-border/5 flex-1 flex flex-col min-h-0">
                <div className="flex gap-1 mb-4 p-1 rounded-2xl bg-muted/40 border border-border/40">
                    <button
                        onClick={() => setActiveTab('goals')}
                        className={cn(
                            "flex flex-1 items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200",
                            activeTab === 'goals'
                                ? "bg-background/80 text-foreground shadow-sm ring-1 ring-border/60"
                                : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                        )}
                    >
                        <Target className="w-4 h-4" />
                        {t.myGoals}
                    </button>
                    <button
                        onClick={() => setActiveTab('statistics')}
                        className={cn(
                            "flex flex-1 items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200",
                            activeTab === 'statistics'
                                ? "bg-background/80 text-foreground shadow-sm ring-1 ring-border/60"
                                : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                        )}
                    >
                        <BarChart3 className="w-4 h-4" />
                        {t.goalsStatistics}
                    </button>
                </div>

                {activeTab === 'goals' ? (
                    <ScrollArea className="flex-1 min-h-0" dir={isArabic ? 'rtl' : 'ltr'}>
                        <div className="space-y-3">
                            {goals.map((goal) => {
                                const isSelected = selectedGoalId === goal.id;
                                const titleRTL = isArabic || isRTL(goal.title);
                                const currentPoints = goal.current_points ?? 0;
                                const targetPoints = goal.target_points ?? 0;
                                const progress = targetPoints > 0
                                    ? Math.round((currentPoints / targetPoints) * 100)
                                    : 0;
                                const daysChip = getGoalEndDaysChip(goal.estimated_completion_date, isArabic);
                                const stats = taskStatsMap[goal.id];

                                return (
                                    <div
                                        key={goal.id}
                                        className={`group relative w-full rounded-2xl border border-border/80 bg-white p-3 transition-all dark:bg-card/50 sm:p-4 ${isSelected
                                                ? 'border-primary/70 shadow-md shadow-primary/10 ring-1 ring-primary/20'
                                                : 'shadow-sm hover:border-primary/35 hover:shadow-md'
                                            } ${deletingId === goal.id ? 'opacity-50 pointer-events-none' : ''}`}
                                    >
                                        <div
                                            onClick={() => onSelectGoal(goal.id)}
                                            className="flex w-full cursor-pointer flex-col gap-3"
                                            role="button"
                                            tabIndex={0}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' || e.key === ' ') {
                                                    e.preventDefault();
                                                    onSelectGoal(goal.id);
                                                }
                                            }}
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3" dir={titleRTL ? 'rtl' : 'ltr'}>
                                                    <div
                                                        className={cn(
                                                            'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 p-2.5 text-primary shadow-sm transition-colors sm:h-12 sm:w-12 sm:rounded-2xl',
                                                            isSelected && 'bg-primary text-primary-foreground border-primary shadow-md shadow-primary/15',
                                                        )}
                                                    >
                                                        {getGoalIcon(goal.icon)}
                                                    </div>

                                                    <div className="min-w-0 flex-1">
                                                        <h3
                                                            className={cn(
                                                                'line-clamp-2 text-base font-black text-foreground transition-colors sm:text-lg',
                                                                isSelected && 'text-primary',
                                                                titleRTL ? 'text-right' : 'text-left',
                                                            )}
                                                        >
                                                            {goal.title}
                                                        </h3>

                                                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                                                            {goal.is_pinned && (
                                                                <span className="flex items-center gap-0.5 rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                                                                    <Pin className="h-3 w-3" />
                                                                    {isArabic ? 'مثبت' : 'Pinned'}
                                                                </span>
                                                            )}
                                                            {daysChip && (
                                                                <span
                                                                    className={cn(
                                                                        'flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums',
                                                                        daysChip.tone === 'soon' && 'bg-primary/10 text-primary',
                                                                        daysChip.tone === 'today' && 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
                                                                        daysChip.tone === 'late' && 'bg-destructive/10 text-destructive',
                                                                    )}
                                                                    title={daysChip.title}
                                                                >
                                                                    <Clock className="h-3 w-3 shrink-0" aria-hidden />
                                                                    {daysChip.text}
                                                                </span>
                                                            )}
                                                            {stats && stats.total > 0 && (
                                                                <span
                                                                    className="flex items-center gap-0.5 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-primary"
                                                                    title={isArabic ? `${stats.completed} من ${stats.total} مهمة منجزة` : `${stats.completed} of ${stats.total} tasks done`}
                                                                >
                                                                    <ListChecks className="h-3 w-3 shrink-0" aria-hidden />
                                                                    <span dir="ltr">{stats.completed}/{stats.total}</span>
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex shrink-0 items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <button
                                                                className="rounded-xl border border-transparent p-2 text-muted-foreground transition-all hover:border-border/60 hover:bg-muted/60 hover:text-foreground sm:p-2.5"
                                                                aria-label={language === 'ar' ? 'خيارات الهدف' : 'Goal options'}
                                                            >
                                                                <MoreVertical className="h-4 w-4 sm:h-5 sm:w-5" />
                                                            </button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align={isArabic ? 'start' : 'end'} className="w-52">
                                                            <DropdownMenuItem
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleTogglePin(goal);
                                                                }}
                                                                className="cursor-pointer"
                                                            >
                                                                {goal.is_pinned ? (
                                                                    <>
                                                                        <PinOff className="w-4 h-4" />
                                                                        {t.unpinGoal}
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <Pin className="w-4 h-4" />
                                                                        {t.pinGoal}
                                                                    </>
                                                                )}
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    openEditDialog(goal);
                                                                }}
                                                                className="cursor-pointer"
                                                            >
                                                                <Edit2 className="w-4 h-4" />
                                                                {t.editGoal}
                                                            </DropdownMenuItem>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem
                                                                variant="destructive"
                                                                className="cursor-pointer"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setConfirmDeleteGoal({ id: goal.id, title: goal.title });
                                                                }}
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                                {language === 'ar' ? 'حذف الهدف' : 'Delete Goal'}
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </div>
                                            </div>

                                            <GoalProgressBar
                                                currentPoints={currentPoints}
                                                targetPoints={targetPoints}
                                                progress={progress}
                                                className="mx-auto"
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </ScrollArea>
                ) : (
                    <div className="flex-1 flex flex-col rounded-2xl border border-dashed border-border bg-muted/20">
                        <div className="flex-1 flex items-center justify-center">
                            <div className="text-center">
                                <BarChart3 className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                                <p className="text-muted-foreground font-medium text-lg">{t.goalsStatsUnderDevelopment}</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <GoalEditDialog
                goal={editingGoal ? {
                    ...editingGoal,
                    estimated_completion_date: editingGoal.estimated_completion_date || editingGoal.created_at,
                } : null}
                open={!!editingGoal}
                onOpenChange={(open) => {
                    if (!open) {
                        setEditingGoal(null);
                    }
                }}
                language={language}
                onSaved={() => {
                    setEditingGoal(null);
                    if (onGoalChanged) onGoalChanged();
                }}
            />

            <ConfirmModal
                isOpen={!!confirmDeleteGoal}
                title={isArabic ? 'حذف الهدف' : 'Delete Goal'}
                message={
                    confirmDeleteGoal
                        ? isArabic
                            ? `هل أنت متأكد من حذف الهدف "${confirmDeleteGoal.title}"؟ لا يمكن التراجع عن هذا الإجراء.`
                            : `Are you sure you want to delete "${confirmDeleteGoal.title}"? This action cannot be undone.`
                        : ''
                }
                confirmLabel={isArabic ? 'حذف' : 'Delete'}
                variant="danger"
                language={language}
                onCancel={() => setConfirmDeleteGoal(null)}
                onConfirm={() => {
                    if (confirmDeleteGoal) handleDeleteGoal(confirmDeleteGoal.id);
                }}
            />
        </div>
    );
}
