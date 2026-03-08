'use client';

import { useState } from 'react';
import { Target, Calendar, TrendingUp, CheckCircle, Trash2, MoreVertical, Pin, PinOff, Edit2 } from 'lucide-react';
import { translations, type Language } from '@/lib/translations';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createClient } from '@/utils/supabase/client';
import { IconPicker, getIconComponent } from './IconPicker';

interface Goal {
    id: string;
    title: string;
    current_points: number;
    target_points: number;
    status: string;
    created_at: string;
    estimated_completion_date: string;
    icon?: string;
    is_pinned?: boolean;
}

interface GoalsListProps {
    goals: Goal[];
    selectedGoalId: string | null;
    onSelectGoal: (id: string) => void;
    onGoalChanged?: () => void;
    language?: Language;
}

export default function GoalsList({ goals, selectedGoalId, onSelectGoal, onGoalChanged, language = 'en' }: GoalsListProps) {
    const t = translations[language];
    const isArabic = language === 'ar';
    const supabase = createClient();
    const [deletingId, setDeletingId] = useState<string | null>(null);

    // Edit State
    const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
    const [editTitle, setEditTitle] = useState('');
    const [editIcon, setEditIcon] = useState('Target');
    const [isUpdating, setIsUpdating] = useState(false);

    const handleDeleteGoal = async (goalId: string, goalTitle: string) => {
        const confirmMessage = language === 'ar'
            ? `هل أنت متأكد من حذف الهدف "${goalTitle}"؟`
            : `Are you sure you want to delete "${goalTitle}"?`;

        if (!confirm(confirmMessage)) return;

        setDeletingId(goalId);

        try {
            // All child tables (daily_logs, sub_layers, goal_investigations,
            // weekly_summaries, analytics_cache) have ON DELETE CASCADE,
            // so deleting the goal automatically cleans up everything.
            const { error } = await supabase.from('goals').delete().eq('id', goalId);

            if (error) throw error;

            if (onGoalChanged) onGoalChanged();
        } catch (error: any) {
            console.error('Error deleting goal:', error);
            alert((language === 'ar' ? 'فشل حذف الهدف: ' : 'Failed to delete goal: ') + (error?.message || JSON.stringify(error)));
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
        setEditTitle(goal.title);
        setEditIcon(goal.icon || 'Target');
    };

    const handleUpdateGoal = async () => {
        if (!editingGoal) return;
        setIsUpdating(true);

        try {
            const { error } = await supabase
                .from('goals')
                .update({
                    title: editTitle,
                    icon: editIcon
                })
                .eq('id', editingGoal.id);

            if (error) throw error;

            setEditingGoal(null);
            if (onGoalChanged) onGoalChanged(); // Refresh list
        } catch (error) {
            console.error('Error updating goal:', error);
        } finally {
            setIsUpdating(false);
        }
    };

    const isRTL = (text: string) => {
        const arabicRegex = /[\u0600-\u06ff]/;
        return arabicRegex.test(text);
    };

    if (goals.length === 0) {
        return (
            <div className="w-full max-w-3xl animate-in fade-in slide-in-from-bottom-8 duration-500">
                <div className="bg-card/30 backdrop-blur-xl p-8 rounded-[32px] border border-border ring-1 ring-border/5 shadow-2xl">
                    <div className="text-center p-12 bg-muted/20 rounded-2xl border border-dashed border-border">
                        <Target className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground font-medium text-lg">{t.noGoalsYet}</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full max-w-4xl animate-in fade-in slide-in-from-bottom-8 duration-500">
            <div className="bg-card/30 backdrop-blur-xl p-4 sm:p-6 lg:p-8 rounded-[20px] sm:rounded-[32px] border border-border ring-1 ring-border/5 shadow-2xl space-y-4 sm:space-y-6">
                <div className={isArabic ? 'text-right' : 'text-left'}>
                    <h2 className="text-2xl sm:text-3xl font-black text-foreground mb-2">{t.myGoals}</h2>
                    <p className="text-sm text-muted-foreground">
                        {goals.length} {goals.length === 1 ? (language === 'ar' ? 'هدف' : 'Goal') : (language === 'ar' ? 'أهداف' : 'Goals')}
                    </p>
                </div>

                <div className="space-y-3">
                    {goals.map((goal) => {
                        const isSelected = selectedGoalId === goal.id;
                        const titleRTL = isArabic || isRTL(goal.title);
                        const currentPoints = goal.current_points ?? 0;
                        const targetPoints = goal.target_points ?? 0;
                        const progress = targetPoints > 0
                            ? Math.round((currentPoints / targetPoints) * 100)
                            : 0;
                        const Icon = getIconComponent(goal.icon || 'Target');

                        return (
                            <div
                                key={goal.id}
                                className={`w-full rounded-2xl border border-border/80 bg-white dark:bg-card/50 p-3 sm:p-4 transition-all relative group ${isSelected
                                        ? 'ring-1 ring-primary/20 border-primary bg-primary/5 shadow-md'
                                        : 'hover:border-primary/40 hover:bg-primary/5 shadow-sm hover:shadow-md'
                                    } ${deletingId === goal.id ? 'opacity-50 pointer-events-none' : ''}`}
                            >
                                <div
                                    onClick={() => onSelectGoal(goal.id)}
                                    className="w-full cursor-pointer flex flex-col gap-3"
                                    role="button"
                                    tabIndex={0}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            e.preventDefault();
                                            onSelectGoal(goal.id);
                                        }
                                    }}
                                >
                                    {/* Header: Icon + Title + Pin & Menu */}
                                    <div className="flex items-center gap-3 w-full" dir={titleRTL ? 'rtl' : 'ltr'}>
                                        <div className={`shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center border transition-colors shadow-sm ${isSelected
                                                ? 'bg-primary text-primary-foreground border-primary'
                                                : 'bg-muted/50 text-muted-foreground border-border group-hover:border-primary/50 group-hover:text-primary'
                                            }`}>
                                            <Icon className="w-6 h-6" />
                                        </div>

                                        <h3
                                            className={`text-lg font-bold flex-1 truncate ${isSelected ? 'text-primary' : 'text-foreground group-hover:text-primary'
                                                } ${titleRTL ? 'text-right' : 'text-left'}`}
                                        >
                                            {goal.title}
                                        </h3>

                                        <div className="flex items-center gap-1 shrink-0" dir="ltr">
                                            {goal.is_pinned && (
                                                <div className="w-8 h-8 flex items-center justify-center rounded-full bg-chart-5/10">
                                                    <Pin className="w-4 h-4 text-chart-5 rotate-45" />
                                                </div>
                                            )}
                                            <div onClick={(e) => e.stopPropagation()}>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <button
                                                            className="w-8 h-8 flex items-center justify-center hover:bg-muted rounded-full transition-colors text-muted-foreground hover:text-foreground"
                                                        >
                                                            <MoreVertical className="w-4 h-4" />
                                                        </button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="w-48">
                                                        <DropdownMenuItem
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleTogglePin(goal);
                                                            }}
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
                                                        >
                                                            <Edit2 className="w-4 h-4" />
                                                            {t.editGoal}
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem
                                                            variant="destructive"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleDeleteGoal(goal.id, goal.title);
                                                            }}
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                            {language === 'ar' ? 'حذف الهدف' : 'Delete Goal'}
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Progress Bar Tube */}
                                    <div className="relative h-10 w-full bg-muted/30 rounded-2xl overflow-hidden border border-border/70 mx-auto">
                                        <div className="absolute inset-x-0 top-0 h-[40%] bg-gradient-to-b from-black/5 to-transparent z-10 pointer-events-none" />
                                        <div
                                            className="h-full bg-gradient-to-r from-primary/80 via-primary to-primary transition-all duration-1000 ease-out relative shadow-[0_0_15px_rgba(var(--primary),0.3)]"
                                            style={{ width: `${Math.min(100, progress)}%` }}
                                        >
                                            <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent" />
                                            <div className="absolute right-0 top-0 bottom-0 w-[2px] bg-white/40 shadow-[0_0_10px_rgba(255,255,255,0.5)]" />
                                        </div>
                                        <div className="absolute inset-0 flex items-center justify-between px-2 sm:px-5 z-20 font-bold text-[10px] sm:text-sm tracking-wide" dir="ltr">
                                            <span className="text-foreground/70 mix-blend-screen drop-shadow-sm tabular-nums flex items-center gap-1">
                                                {currentPoints.toLocaleString()}
                                                <span className="text-[9px] sm:text-[10px] opacity-70 font-medium">XP</span>
                                            </span>
                                            <span className="text-foreground/90 mix-blend-screen drop-shadow-sm font-black text-xs sm:text-base">
                                                {progress}%
                                            </span>
                                            <span className="text-muted-foreground/80 mix-blend-screen drop-shadow-sm tabular-nums flex items-center gap-0.5">
                                                <span className="text-[9px] sm:text-[10px] opacity-60">/</span>
                                                {targetPoints.toLocaleString()}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Edit Dialog */}
            <Dialog open={!!editingGoal} onOpenChange={(open) => !open && setEditingGoal(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t.editGoal}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">{t.selectIcon}</label>
                            <div className="flex justify-center">
                                <IconPicker
                                    selectedIcon={editIcon}
                                    onSelectIcon={setEditIcon}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">{t.goalTitle}</label>
                            <Input
                                value={editTitle}
                                onChange={(e) => setEditTitle(e.target.value)}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditingGoal(null)}>{t.cancel}</Button>
                        <Button onClick={handleUpdateGoal} disabled={isUpdating}>
                            {t.saveChanges}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
