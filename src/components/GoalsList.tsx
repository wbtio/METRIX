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
    onGoalDeleted?: () => void;
    language?: Language;
}

export default function GoalsList({ goals, selectedGoalId, onSelectGoal, onGoalDeleted, language = 'en' }: GoalsListProps) {
    const t = translations[language];
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
            // Delete related data first (respect foreign key constraints)
            console.log('Starting delete for goal:', goalId);
            
            const { error: logsError } = await supabase.from('daily_logs').delete().eq('goal_id', goalId);
            console.log('daily_logs delete result:', logsError || 'success');
            
            const { error: subLayersError } = await supabase.from('sub_layers').delete().eq('goal_id', goalId);
            console.log('sub_layers delete result:', subLayersError || 'success');
            
            const { error: investigationsError } = await supabase.from('goal_investigations').delete().eq('goal_id', goalId);
            console.log('goal_investigations delete result:', investigationsError || 'success');
            
            // Delete the goal
            const { error } = await supabase.from('goals').delete().eq('id', goalId);
            console.log('goals delete result:', error || 'success');
            
            if (error) throw error;
            
            if (onGoalDeleted) onGoalDeleted();
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
            if (onGoalDeleted) onGoalDeleted(); // Refresh list
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
            if (onGoalDeleted) onGoalDeleted(); // Refresh list
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
            <div className="bg-card/30 backdrop-blur-xl p-8 rounded-[32px] border border-border ring-1 ring-border/5 shadow-2xl space-y-6">
                <div>
                    <h2 className="text-3xl font-black text-foreground mb-2">{t.myGoals}</h2>
                    <p className="text-sm text-muted-foreground">
                        {goals.length} {goals.length === 1 ? (language === 'ar' ? 'هدف' : 'Goal') : (language === 'ar' ? 'أهداف' : 'Goals')}
                    </p>
                </div>

                <div className="space-y-3">
                    {goals.map((goal) => {
                        const isSelected = selectedGoalId === goal.id;
                        const titleRTL = isRTL(goal.title);
                        const currentPoints = goal.current_points ?? 0;
                        const targetPoints = goal.target_points ?? 0;
                        const progress = targetPoints > 0
                            ? Math.round((currentPoints / targetPoints) * 100)
                            : 0;
                        const Icon = getIconComponent(goal.icon || 'Target');

                        return (
                            <div
                                key={goal.id}
                                className={`w-full p-3 rounded-2xl border transition-all relative group ${
                                    isSelected
                                        ? 'bg-primary/10 border-primary shadow-lg ring-2 ring-primary/20'
                                        : 'bg-card/50 border-border hover:bg-card/70 hover:border-primary/30 hover:shadow-md'
                                } ${deletingId === goal.id ? 'opacity-50 pointer-events-none' : ''}`}
                                dir={titleRTL ? 'rtl' : 'ltr'}
                            >
                                <div
                                    onClick={() => onSelectGoal(goal.id)}
                                    className="w-full cursor-pointer"
                                    role="button"
                                    tabIndex={0}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            e.preventDefault();
                                            onSelectGoal(goal.id);
                                        }
                                    }}
                                >
                                    {/* Row 1: Icon, Title, Pin & Menu */}
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center border transition-colors ${
                                            isSelected 
                                                ? 'bg-primary text-primary-foreground border-primary' 
                                                : 'bg-muted/50 text-muted-foreground border-border group-hover:border-primary/50 group-hover:text-primary'
                                        }`}>
                                            <Icon className="w-5 h-5" />
                                        </div>

                                        <h3 
                                            className={`text-base font-bold flex-1 truncate ${
                                                isSelected ? 'text-primary' : 'text-foreground group-hover:text-primary'
                                            }`}
                                            dir={titleRTL ? 'rtl' : 'ltr'}
                                        >
                                            {goal.title}
                                        </h3>

                                        <div className="flex items-center gap-1 shrink-0">
                                            {goal.is_pinned && (
                                                <Pin className="w-3.5 h-3.5 text-chart-5 rotate-45" />
                                            )}
                                            <div onClick={(e) => e.stopPropagation()}>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <button 
                                                            className="p-1.5 hover:bg-muted rounded-lg transition-colors text-muted-foreground hover:text-foreground"
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

                                    {/* Row 2: Progress Bar with embedded percentage and points */}
                                    <div className="mb-1.5">
                                        <div className="relative h-6 w-full bg-muted/50 rounded-lg overflow-hidden border border-border shadow-inner">
                                            <div
                                                className={`h-full bg-gradient-to-r transition-all duration-1000 ease-out relative ${
                                                    isSelected ? 'from-primary via-primary/80 to-chart-1' : 'from-chart-2 via-chart-2/80 to-chart-2/60'
                                                }`}
                                                style={{ width: `${Math.min(100, progress)}%` }}
                                            >
                                                <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/waves.png')] animate-pulse"></div>
                                                <div className="absolute top-0 start-0 w-full h-1/2 bg-white/20"></div>
                                            </div>
                                            
                                            <div className="absolute inset-0 flex items-center justify-center px-3 z-10">
                                                <span className="text-xs font-black text-foreground/80 bg-background/30 backdrop-blur-[2px] px-2 py-0.5 rounded border border-white/10">
                                                    {progress}%
                                                </span>
                                            </div>
                                        </div>
                                        <div className="mt-1 flex items-center justify-between text-[10px] font-bold text-foreground/70 tabular-nums">
                                            <span className="whitespace-nowrap">{currentPoints.toLocaleString()}</span>
                                            <span className="whitespace-nowrap">{targetPoints.toLocaleString()}</span>
                                        </div>
                                    </div>

                                    {/* Row 3: Dates - Compact */}
                                    <div className="flex items-center gap-2 text-[9px] text-muted-foreground">
                                        <div className="flex items-center gap-1">
                                            <Calendar className="w-2.5 h-2.5" />
                                            <span>{new Date(goal.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                                        </div>
                                        {goal.estimated_completion_date && (
                                            <>
                                                <span className="text-muted-foreground/50">→</span>
                                                <div className="flex items-center gap-1">
                                                    <Target className="w-2.5 h-2.5" />
                                                    <span>{new Date(goal.estimated_completion_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                                                </div>
                                                <span className="text-muted-foreground/50">•</span>
                                                <span className="font-bold text-primary">
                                                    {(() => {
                                                        const now = new Date();
                                                        const end = new Date(goal.estimated_completion_date);
                                                        const diffTime = end.getTime() - now.getTime();
                                                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                                                        return diffDays > 0 ? `${diffDays}d ${language === 'ar' ? 'متبقي' : 'left'}` : (language === 'ar' ? 'منتهي' : 'ended');
                                                    })()}
                                                </span>
                                            </>
                                        )}
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
