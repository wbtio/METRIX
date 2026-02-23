'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Target, TrendingUp, Calendar, CheckCircle, Plus, Activity, Pencil, Trash2, MoreVertical, Eye, X, Pin, PinOff, Clock, Loader2, BarChart3, Sparkles } from 'lucide-react';
import DailyLogModal from './DailyLogModal';
import ActivityHistory from './ActivityHistory';
import StreakFlame from './StreakFlame';
import GrowthChart from './GrowthChart';
import { IconPicker, getIconComponent } from './IconPicker';
import WeeklySummaryCard from './WeeklySummaryCard';
import AdvancedAnalytics from './AdvancedAnalytics';
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { translations, type Language } from '@/lib/translations';
import { cn } from '@/lib/utils';

interface Goal {
    id: string;
    title: string;
    current_points: number;
    target_points: number;
    status: string;
    created_at: string;
    estimated_completion_date: string;
    total_days: number;
    ai_summary: string;
    icon?: string;
    is_pinned?: boolean;
}

interface SubLayer {
    id: string;
    goal_id: string;
    task_description: string;
    impact_weight: number;
    frequency: string;
    completed_count: number;
}

interface Log {
    id: string;
    created_at: string;
    user_input: string;
    ai_score: number;
    ai_feedback: string;
}

export default function Dashboard({ goal, language = 'en', onGoalUpdated }: { goal: Goal; language?: Language; onGoalUpdated?: () => void }) {
    const t = translations[language];
    const isArabic = language === 'ar';
    const supabase = createClient();
    const [subLayers, setSubLayers] = useState<SubLayer[]>([]);
    const [logs, setLogs] = useState<Log[]>([]);
    const [loading, setLoading] = useState(true);
    const [showLogModal, setShowLogModal] = useState(false);
    const [streak, setStreak] = useState(0);
    const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
    const [showGoalDetails, setShowGoalDetails] = useState(false);
    const [isEditingGoalName, setIsEditingGoalName] = useState(false);
    const [editedGoalName, setEditedGoalName] = useState(goal.title);
    const [editedGoalIcon, setEditedGoalIcon] = useState(goal.icon || 'Target');
    // We use a local state for points to allow for corrections/updates without page reload
    const [displayPoints, setDisplayPoints] = useState(goal.current_points ?? 0);
    // Add Task state
    const [showAddTask, setShowAddTask] = useState(false);
    const [newTaskDescription, setNewTaskDescription] = useState('');
    const [newTaskFrequency, setNewTaskFrequency] = useState<'daily' | 'weekly' | 'monthly'>('daily');
    const [newTaskWeight, setNewTaskWeight] = useState(5);
    const [addingTask, setAddingTask] = useState(false);

    const isRTL = (text: string) => {
        const arabicRegex = /[\u0600-\u06ff]/;
        return arabicRegex.test(text);
    };

    const goalTitleRTL = isRTL(goal.title);
    const goalSummaryRTL = goal.ai_summary ? isRTL(goal.ai_summary) : false;
    const GoalIcon = getIconComponent(goal.icon || 'Target');
    const currentPoints = displayPoints;
    const targetPoints = goal.target_points ?? 0;
    const progressPercent = targetPoints > 0 ? Math.round((currentPoints / targetPoints) * 100) : 0;

    useEffect(() => {
        if (goal?.id) {
            fetchData();
            setEditedGoalName(goal.title);
            setEditedGoalIcon(goal.icon || 'Target');
            setDisplayPoints(goal.current_points ?? 0);
        }
    }, [goal?.id]);

    const fetchData = async () => {
        setLoading(true);
        await Promise.all([fetchSubLayers(), fetchLogs()]);
        setLoading(false);
    };

    const fetchSubLayers = async () => {
        const { data, error } = await supabase
            .from('sub_layers')
            .select('*')
            .eq('goal_id', goal.id)
            .order('impact_weight', { ascending: false });

        if (error) console.error(error);
        else setSubLayers(data || []);
    };

    const fetchLogs = async () => {
        const { data, error } = await supabase
            .from('daily_logs')
            .select('*')
            .eq('goal_id', goal.id)
            .order('created_at', { ascending: false });

        if (error) {
            console.error(error);
        } else {
            const fetchedLogs = data || [];
            setLogs(fetchedLogs);
            calculateStreak(fetchedLogs);

            // AUTO-REPAIR: Calculate the TRUE total points from history
            // Sometimes the goal.current_points gets out of sync or reset. 
            // This ensures we always show (and save) the correct sum of history.
            const calculatedTotal = fetchedLogs.reduce((sum, log) => sum + (log.ai_score || 0), 0);

            setDisplayPoints(calculatedTotal);

            if (calculatedTotal !== goal.current_points) {
                console.log(`Fixing points mismatch for goal ${goal.id}: DB=${goal.current_points}, CALC=${calculatedTotal}`);
                // Update Supabase silently to fix validity
                supabase.from('goals')
                    .update({ current_points: calculatedTotal })
                    .eq('id', goal.id)
                    .then(({ error }) => {
                        if (error) console.error('Failed to auto-repair points:', error);
                        else if (onGoalUpdated) onGoalUpdated();
                    });
            }
        }
    };

    const calculateStreak = (logsData: Log[]) => {
        if (!logsData.length) {
            setStreak(0);
            return;
        }

        // Convert to LOCAL date strings (user's browser timezone, not UTC)
        const toLocalDateStr = (isoStr: string) => {
            const d = new Date(isoStr);
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        };

        const uniqueDates = Array.from(
            new Set(logsData.map(l => toLocalDateStr(l.created_at)))
        ).sort().reverse();

        if (uniqueDates.length === 0) {
            setStreak(0);
            return;
        }

        const now = new Date();
        const today = toLocalDateStr(now.toISOString());
        const yesterdayDate = new Date(now);
        yesterdayDate.setDate(yesterdayDate.getDate() - 1);
        const yesterday = toLocalDateStr(yesterdayDate.toISOString());

        // If no log today or yesterday, streak is broken (0)
        if (uniqueDates[0] !== today && uniqueDates[0] !== yesterday) {
            setStreak(0);
            return;
        }

        let currentStreak = 1;
        for (let i = 1; i < uniqueDates.length; i++) {
            const prevDate = new Date(uniqueDates[i - 1]);
            prevDate.setDate(prevDate.getDate() - 1);
            if (toLocalDateStr(prevDate.toISOString()) === uniqueDates[i]) {
                currentStreak++;
            } else {
                break;
            }
        }
        setStreak(currentStreak);
    };

    const handleDeleteTask = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this task?')) return;

        const { error } = await supabase.from('sub_layers').delete().eq('id', id);
        if (error) {
            alert('Failed to delete task');
            console.error(error);
        } else {
            fetchSubLayers();
        }
    };

    // Simple prompt-based edit for now to avoid complex UI state
    const handleEditTask = async (task: SubLayer) => {
        const newDescription = window.prompt('Update task description:', task.task_description);
        if (newDescription === null || newDescription === task.task_description) return;
        if (!newDescription.trim()) return alert('Description cannot be empty');

        const { error } = await supabase
            .from('sub_layers')
            .update({ task_description: newDescription })
            .eq('id', task.id);

        if (error) {
            alert('Failed to update task');
            console.error(error);
        } else {
            fetchSubLayers();
        }
    };

    const handleSaveGoalDetails = async () => {
        if (!editedGoalName.trim()) {
            alert(language === 'ar' ? 'لا يمكن أن يكون اسم الهدف فارغاً' : 'Goal name cannot be empty');
            return;
        }

        if (editedGoalName === goal.title && editedGoalIcon === goal.icon) {
            setIsEditingGoalName(false);
            return;
        }

        const { error } = await supabase
            .from('goals')
            .update({
                title: editedGoalName,
                icon: editedGoalIcon
            })
            .eq('id', goal.id);

        if (error) {
            console.error('Error updating goal details:', error);
            alert(language === 'ar' ? 'فشل تحديث الهدف' : 'Failed to update goal');
        } else {
            setIsEditingGoalName(false);
            onGoalUpdated?.();
        }
    };

    const handleTogglePin = async () => {
        try {
            const { error } = await supabase
                .from('goals')
                .update({ is_pinned: !goal.is_pinned })
                .eq('id', goal.id);

            if (error) throw error;

            onGoalUpdated?.();
        } catch (error) {
            console.error('Error toggling pin:', error);
            alert(language === 'ar' ? 'فشل تثبيت الهدف' : 'Failed to pin goal');
        }
    };

    const handleAddTask = async () => {
        if (!newTaskDescription.trim()) {
            alert(language === 'ar' ? 'يرجى كتابة وصف المهمة' : 'Please enter a task description');
            return;
        }

        setAddingTask(true);
        try {
            const { error } = await supabase
                .from('sub_layers')
                .insert({
                    goal_id: goal.id,
                    task_description: newTaskDescription.trim(),
                    frequency: newTaskFrequency,
                    impact_weight: newTaskWeight,
                    completed_count: 0
                });

            if (error) throw error;

            // Reset form and refresh
            setNewTaskDescription('');
            setNewTaskFrequency('daily');
            setNewTaskWeight(5);
            setShowAddTask(false);
            fetchSubLayers();
        } catch (error: any) {
            console.error('Error adding task:', error);
            alert(language === 'ar' ? `فشل إضافة المهمة: ${error.message}` : `Failed to add task: ${error.message}`);
        } finally {
            setAddingTask(false);
        }
    };

    const activeSubLayers = subLayers;
    const insightsPanelHeightClass = 'lg:h-[min(58vh,560px)]';
    const sidePanelHeightClass = 'lg:h-auto';

    if (loading && !goal) { // Only full page load if goal is missing, otherwise we might just be refreshing data
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="space-y-3 sm:space-y-4 animate-in fade-in duration-500">

            <div className={cn("grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4 lg:items-stretch", isArabic ? "lg:[direction:rtl]" : "")}>

                {/* SECTION 1: GOAL CARD (PROGRESS BAR) - Always first */}
                <div className={cn("order-1 lg:col-span-2 lg:row-start-1", isArabic ? "lg:col-start-2" : "lg:col-start-1")}>
                    <div className="bg-card/30 backdrop-blur-xl p-4 sm:p-5 rounded-[20px] sm:rounded-[28px] shadow-2xl border border-border relative overflow-hidden ring-1 ring-border/5">
                        {/* Header: Title, Icon and Dropdown */}
                        <div className="flex items-center justify-between gap-3 sm:gap-4 mb-3 sm:mb-4">
                            {isEditingGoalName ? (
                                <div className="flex-1 flex flex-col gap-2.5">
                                    {/* Row 1: Icon + Name Input */}
                                    <div className="flex gap-2 items-center">
                                        <IconPicker
                                            selectedIcon={editedGoalIcon}
                                            onSelectIcon={setEditedGoalIcon}
                                            className="h-10 w-10 sm:h-[52px] sm:w-[52px] shrink-0 rounded-lg sm:rounded-xl"
                                        />
                                        <input
                                            type="text"
                                            value={editedGoalName}
                                            onChange={(e) => setEditedGoalName(e.target.value)}
                                            className="flex-1 text-base sm:text-2xl font-black text-foreground bg-muted/50 border-2 border-primary rounded-lg sm:rounded-xl px-3 sm:px-4 py-2 focus:outline-none focus:border-primary min-w-0"
                                            dir={goalTitleRTL ? 'rtl' : 'ltr'}
                                            autoFocus
                                            onKeyPress={(e) => {
                                                if (e.key === 'Enter') {
                                                    handleSaveGoalDetails();
                                                }
                                            }}
                                        />
                                    </div>
                                    {/* Row 2: Save / Cancel Buttons */}
                                    <div className="flex gap-2">
                                        <button
                                            onClick={handleSaveGoalDetails}
                                            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg sm:rounded-xl font-bold hover:opacity-90 transition-all flex items-center justify-center gap-2 flex-1 sm:flex-none text-sm sm:text-base"
                                        >
                                            <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                                            <span className="sm:hidden">{isArabic ? 'حفظ' : 'Save'}</span>
                                        </button>
                                        <button
                                            onClick={() => {
                                                setIsEditingGoalName(false);
                                                setEditedGoalName(goal.title);
                                                setEditedGoalIcon(goal.icon || 'Target');
                                            }}
                                            className="px-4 py-2 bg-muted text-foreground rounded-lg sm:rounded-xl font-bold hover:bg-muted/80 transition-all flex items-center justify-center gap-2 flex-1 sm:flex-none text-sm sm:text-base"
                                        >
                                            <X className="w-4 h-4 sm:w-5 sm:h-5" />
                                            <span className="sm:hidden">{isArabic ? 'إلغاء' : 'Cancel'}</span>
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
                                        <GoalIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                                    </div>
                                    <h2
                                        className="text-xl sm:text-3xl font-black text-foreground tracking-tight flex-1 truncate"
                                        dir={goalTitleRTL ? 'rtl' : 'ltr'}
                                        style={{ textAlign: goalTitleRTL ? 'right' : 'left' }}
                                    >
                                        {goal.title}
                                    </h2>
                                </div>
                            )}
                            {!isEditingGoalName && (
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <button className="p-2 hover:bg-muted rounded-lg transition-colors text-muted-foreground hover:text-foreground shrink-0">
                                            <MoreVertical className="w-5 h-5" />
                                        </button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-48">
                                        <DropdownMenuItem onClick={handleTogglePin}>
                                            {goal.is_pinned ? (
                                                <>
                                                    <PinOff className="w-4 h-4" />
                                                    {language === 'ar' ? 'إلغاء تثبيت الهدف' : 'Unpin Goal'}
                                                </>
                                            ) : (
                                                <>
                                                    <Pin className="w-4 h-4" />
                                                    {language === 'ar' ? 'تثبيت الهدف' : 'Pin Goal'}
                                                </>
                                            )}
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => setShowGoalDetails(!showGoalDetails)}>
                                            <Eye className="w-4 h-4" />
                                            {showGoalDetails ? t.hideDetails : t.viewDetails}
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem onClick={() => {
                                            setIsEditingGoalName(true);
                                            setEditedGoalName(goal.title);
                                            setEditedGoalIcon(goal.icon || 'Target');
                                        }}>
                                            <Pencil className="w-4 h-4" />
                                            {language === 'ar' ? 'تعديل الهدف' : 'Edit Goal'}
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            )}
                        </div>

                        {/* Progress Bar with Percentage */}
                        <div className="relative h-10 sm:h-12 w-full bg-muted/40 rounded-2xl sm:rounded-3xl overflow-hidden border border-border/60 shadow-inner ring-1 ring-white/5 mx-auto">
                            {/* Tube Background Effect */}
                            <div className="absolute inset-x-0 top-0 h-[40%] bg-gradient-to-b from-black/5 to-transparent z-10 pointer-events-none"></div>

                            {/* Filling */}
                            <div
                                className="h-full bg-gradient-to-r from-primary via-primary to-primary transition-all duration-1000 ease-out relative shadow-[0_0_15px_rgba(var(--primary),0.3)]"
                                style={{ width: `${Math.min(100, progressPercent)}%` }}
                            >
                                {/* Fluid/Glass Effect on Fill */}
                                <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent"></div>
                                <div className="absolute inset-0 opacity-30 bg-[url('https://www.transparenttextures.com/patterns/waves.png')] animate-pulse"></div>

                                {/* Light Shine on right edge */}
                                <div className="absolute right-0 top-0 bottom-0 w-[2px] bg-white/40 shadow-[0_0_10px_rgba(255,255,255,0.5)]"></div>
                            </div>

                            {/* Content Inside Tube - with XP labels for clarity */}
                            <div className="absolute inset-0 flex items-center justify-between px-3 sm:px-5 z-20 font-bold text-xs sm:text-sm tracking-wide" dir="ltr">
                                <span className="text-foreground/70 mix-blend-screen drop-shadow-sm tabular-nums flex items-center gap-1">
                                    {currentPoints.toLocaleString()}
                                    <span className="text-[9px] sm:text-[10px] opacity-70 font-medium">XP</span>
                                </span>
                                <span className="text-foreground/90 mix-blend-screen drop-shadow-sm font-black text-sm sm:text-base">
                                    {progressPercent}%
                                </span>
                                <span className="text-muted-foreground/80 mix-blend-screen drop-shadow-sm tabular-nums flex items-center gap-0.5">
                                    <span className="text-[9px] sm:text-[10px] opacity-60">/</span>
                                    {targetPoints.toLocaleString()}
                                </span>
                            </div>
                        </div>

                        {showGoalDetails && (
                            <div className="animate-in fade-in slide-in-from-top-2 duration-200 pt-4 border-t border-border space-y-3">
                                {/* Goal Stats Row */}
                                <div className="grid grid-cols-3 gap-3">
                                    <div className="bg-muted/30 p-3 rounded-xl border border-border text-center">
                                        <div className="flex items-center justify-center gap-1.5 mb-1">
                                            <Calendar className="w-3.5 h-3.5 text-chart-2" />
                                            <span className="text-[10px] font-bold text-muted-foreground uppercase">{language === 'ar' ? 'البداية' : 'Started'}</span>
                                        </div>
                                        <p className="text-sm font-bold text-foreground">
                                            {new Date(goal.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                        </p>
                                    </div>
                                    <div className="bg-primary/10 p-3 rounded-xl border border-primary/20 text-center">
                                        <div className="flex items-center justify-center gap-1.5 mb-1">
                                            <Target className="w-3.5 h-3.5 text-primary" />
                                            <span className="text-[10px] font-bold text-primary/80 uppercase">{language === 'ar' ? 'متبقي' : 'Days Left'}</span>
                                        </div>
                                        <p className="text-sm font-bold text-primary">
                                            {(() => {
                                                const now = new Date();
                                                const end = new Date(goal.estimated_completion_date);
                                                const diffTime = end.getTime() - now.getTime();
                                                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                                                return diffDays > 0 ? `${diffDays} ${language === 'ar' ? 'يوم' : 'days'}` : (language === 'ar' ? 'منتهي' : 'Ended');
                                            })()}
                                        </p>
                                    </div>
                                    <div className="bg-muted/30 p-3 rounded-xl border border-border text-center">
                                        <div className="flex items-center justify-center gap-1.5 mb-1">
                                            <Calendar className="w-3.5 h-3.5 text-chart-5" />
                                            <span className="text-[10px] font-bold text-muted-foreground uppercase">{language === 'ar' ? 'النهاية' : 'Target'}</span>
                                        </div>
                                        <p className="text-sm font-bold text-foreground">
                                            {new Date(goal.estimated_completion_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                        </p>
                                    </div>
                                </div>

                                {goal.ai_summary && (
                                    <div className="bg-primary/10 p-4 rounded-2xl border border-primary/20">
                                        <p
                                            className="text-primary text-sm italic leading-relaxed"
                                            dir={goalSummaryRTL ? 'rtl' : 'ltr'}
                                            style={{ textAlign: goalSummaryRTL ? 'right' : 'left' }}
                                        >
                                            " {goal.ai_summary} "
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* SECTION 2: DAILY FOCUS + ACTIVITY HISTORY - Second on mobile, sidebar on desktop */}
                <div className={cn("order-2 lg:row-start-1 lg:row-span-2 flex flex-col", sidePanelHeightClass, isArabic ? "lg:col-start-1" : "lg:col-start-3")}>
                    <Tabs defaultValue="daily-focus" className="lg:min-h-0 lg:flex-1 bg-card/40 backdrop-blur-xl rounded-[20px] sm:rounded-[30px] border border-border/80 shadow-2xl ring-1 ring-border/10 overflow-hidden flex flex-col" dir={language === 'ar' ? 'rtl' : 'ltr'}>

                        <div className="p-3 sm:p-4 border-b border-border/60 bg-gradient-to-b from-card/45 to-card/20">
                            <TabsList className="w-full grid grid-cols-2 rounded-2xl border border-border/70 bg-muted/35 p-1.5 !h-12 sm:!h-14 gap-1.5">
                                <TabsTrigger
                                    value="daily-focus"
                                    className="rounded-xl !h-full px-3 sm:px-4 text-xs sm:text-sm font-bold text-foreground/75 data-[state=inactive]:bg-transparent data-[state=inactive]:border-transparent data-[state=inactive]:shadow-none hover:text-foreground hover:bg-muted/40 transition-all gap-2 border border-transparent data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:border-border data-[state=active]:ring-1 data-[state=active]:ring-primary/20 data-[state=active]:shadow-md"
                                >
                                    <CheckCircle className="w-4 h-4" />
                                    {t.dailyFocus}
                                </TabsTrigger>
                                <TabsTrigger
                                    value="activity-history"
                                    className="rounded-xl !h-full px-3 sm:px-4 text-xs sm:text-sm font-bold text-foreground/75 data-[state=inactive]:bg-transparent data-[state=inactive]:border-transparent data-[state=inactive]:shadow-none hover:text-foreground hover:bg-muted/40 transition-all gap-2 border border-transparent data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:border-border data-[state=active]:ring-1 data-[state=active]:ring-primary/20 data-[state=active]:shadow-md"
                                >
                                    <Clock className="w-4 h-4" />
                                    {t.activityHistory}
                                </TabsTrigger>
                            </TabsList>
                        </div>

                        <div className="flex-1 lg:h-0 min-h-0 p-3 sm:p-4 bg-card/5 overflow-hidden flex flex-col">
                            <TabsContent value="daily-focus" className="m-0 flex-1 lg:h-0 min-h-0 overflow-hidden focus-visible:ring-0 data-[state=inactive]:hidden flex flex-col">
                                <div className="lg:h-full min-h-0 lg:max-h-full space-y-3 sm:space-y-3 flex flex-col overflow-hidden">

                                    <div className="flex items-center justify-between">
                                        <h3 className="text-lg sm:text-xl font-bold text-foreground flex items-center gap-2">
                                            <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-chart-2" /> {t.dailyFocus}
                                        </h3>
                                        <button
                                            onClick={() => setShowAddTask(true)}
                                            className="p-2 bg-chart-2/10 hover:bg-chart-2/20 text-chart-2 rounded-xl transition-colors"
                                            title={language === 'ar' ? 'إضافة مهمة جديدة' : 'Add New Task'}
                                        >
                                            <Plus className="w-5 h-5" />
                                        </button>
                                    </div>

                                    <div className="flex-1 min-h-0 space-y-2.5 sm:space-y-3 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
                                        {activeSubLayers.map((layer, idx) => (
                                            <div
                                                key={layer.id}
                                                className="p-3 bg-card/50 backdrop-blur-sm rounded-2xl border border-border shadow-sm hover:shadow-lg hover:bg-card/70 transition-all group relative"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <div className="w-7 h-7 rounded-full bg-muted text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground flex items-center justify-center text-xs font-bold transition-all border border-border shrink-0">
                                                        {idx + 1}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-semibold text-foreground leading-snug text-sm line-clamp-2">
                                                            {layer.task_description}
                                                        </p>
                                                    </div>
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <button className="p-2 hover:bg-muted rounded-lg transition-colors text-muted-foreground hover:text-foreground shrink-0">
                                                                <MoreVertical className="w-4 h-4" />
                                                            </button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end" className="w-48">
                                                            <DropdownMenuItem onClick={() => setExpandedTaskId(expandedTaskId === layer.id ? null : layer.id)}>
                                                                <Eye className="w-4 h-4" />
                                                                {t.viewDetails}
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => handleEditTask(layer)}>
                                                                <Pencil className="w-4 h-4" />
                                                                {t.renameTask}
                                                            </DropdownMenuItem>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem variant="destructive" onClick={() => handleDeleteTask(layer.id)}>
                                                                <Trash2 className="w-4 h-4" />
                                                                {t.deleteTask}
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </div>
                                                {expandedTaskId === layer.id && (
                                                    <div className="mt-3 pt-3 border-t border-border flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
                                                        <span className="text-[10px] font-black uppercase px-2 py-1 bg-muted rounded text-muted-foreground border border-border">
                                                            Weight: {layer.impact_weight}
                                                        </span>
                                                        <span className="text-[10px] font-black uppercase px-2 py-1 bg-primary/10 rounded text-primary border border-primary/20">
                                                            {layer.frequency}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                        {activeSubLayers.length === 0 && (
                                            <div className="p-6 text-center bg-muted/20 rounded-2xl border border-dashed border-border">
                                                <p className="text-muted-foreground text-sm">{t.noTasksFound}</p>
                                            </div>
                                        )}
                                    </div>

                                    <button
                                        onClick={() => setShowLogModal(true)}
                                        className="w-full py-3 sm:py-3.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-2xl font-bold text-sm sm:text-base shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 shrink-0"
                                    >
                                        <Plus className="w-4 h-4 sm:w-5 sm:h-5" /> {t.logProgressButton}
                                    </button>
                                </div>
                            </TabsContent>

                            <TabsContent value="activity-history" className="m-0 flex-1 lg:h-0 min-h-0 overflow-hidden focus-visible:ring-0 data-[state=inactive]:hidden flex flex-col">
                                <ActivityHistory logs={logs} language={language} onLogDeleted={fetchLogs} embedded />
                            </TabsContent>

                        </div>
                    </Tabs>
                </div>

                {/* SECTION 3: INSIGHTS CARD (GROWTH + ANALYTICS + SUMMARY) - Third on mobile, left column row 2 on desktop */}
                <div className={cn("order-3 lg:col-span-2 lg:row-start-2", isArabic ? "lg:col-start-2" : "lg:col-start-1")}>
                    <div className={cn("bg-card/30 backdrop-blur-xl rounded-[20px] sm:rounded-[24px] border border-border shadow-lg overflow-hidden ring-1 ring-border/5", insightsPanelHeightClass)}>
                        <Tabs defaultValue="growth" className="w-full h-full min-h-0 flex flex-col" dir={language === 'ar' ? 'rtl' : 'ltr'}>

                            <div className="px-3 sm:px-5 pt-3 sm:pt-5 pb-2.5 sm:pb-3 border-b border-border/40 bg-card/30">
                                <TabsList className="w-full grid grid-cols-3 gap-1 sm:gap-1.5 rounded-2xl border border-border/60 bg-background/70 p-1 sm:p-1.5 shadow-sm !h-11 sm:!h-14">
                                    <TabsTrigger
                                        value="growth"
                                        className="rounded-xl !h-8 sm:!h-11 px-1.5 sm:px-4 text-[10px] sm:text-sm font-bold text-foreground/80 hover:text-foreground hover:bg-muted/50 transition-all gap-1 sm:gap-2 border border-transparent data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:border-border data-[state=active]:ring-1 data-[state=active]:ring-primary/20 data-[state=active]:shadow-md"
                                    >
                                        <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 ltr:mr-0.5 ltr:sm:mr-1 rtl:ml-0.5 rtl:sm:ml-1" />
                                        <span className="truncate">{language === 'ar' ? 'مخطط النمو' : 'Growth'}</span>
                                    </TabsTrigger>
                                    <TabsTrigger
                                        value="analytics"
                                        className="rounded-xl !h-8 sm:!h-11 px-1.5 sm:px-4 text-[10px] sm:text-sm font-bold text-foreground/80 hover:text-foreground hover:bg-muted/50 transition-all gap-1 sm:gap-2 border border-transparent data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:border-border data-[state=active]:ring-1 data-[state=active]:ring-primary/20 data-[state=active]:shadow-md"
                                    >
                                        <BarChart3 className="w-3.5 h-3.5 sm:w-4 sm:h-4 ltr:mr-0.5 ltr:sm:mr-1 rtl:ml-0.5 rtl:sm:ml-1" />
                                        <span className="truncate">{language === 'ar' ? 'التحليلات' : 'Analytics'}</span>
                                    </TabsTrigger>
                                    <TabsTrigger
                                        value="summary"
                                        className="rounded-xl !h-8 sm:!h-11 px-1.5 sm:px-4 text-[10px] sm:text-sm font-bold text-foreground/80 hover:text-foreground hover:bg-muted/50 transition-all gap-1 sm:gap-2 border border-transparent data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:border-border data-[state=active]:ring-1 data-[state=active]:ring-primary/20 data-[state=active]:shadow-md"
                                    >
                                        <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 ltr:mr-0.5 ltr:sm:mr-1 rtl:ml-0.5 rtl:sm:ml-1" />
                                        <span className="truncate">{language === 'ar' ? 'الملخص' : 'Summary'}</span>
                                    </TabsTrigger>
                                </TabsList>
                            </div>

                            <div className="p-1 bg-card/10 lg:flex-1 lg:min-h-0">
                                <TabsContent value="growth" className="m-0 lg:h-full lg:min-h-0 focus-visible:ring-0 data-[state=inactive]:hidden">
                                    <div className="p-2.5 sm:p-3 space-y-2.5 sm:space-y-3 lg:h-full flex flex-col">
                                        <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-2 sm:gap-2 lg:flex lg:items-stretch lg:gap-3">
                                            <div className="bg-card/40 px-2 sm:px-4 py-2 sm:py-4 rounded-xl sm:rounded-2xl border border-border flex items-center gap-2 sm:gap-3 hover:bg-card/60 transition-all lg:flex-1">
                                                <div className="p-1.5 sm:p-2.5 bg-chart-2/10 rounded-lg sm:rounded-xl text-chart-2">
                                                    <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-sm sm:text-xl font-black text-foreground leading-none">{currentPoints.toLocaleString()}</p>
                                                    <p className="text-[8px] sm:text-[10px] text-muted-foreground font-bold uppercase mt-0.5 sm:mt-1">{t.totalPoints}</p>
                                                </div>
                                            </div>

                                            <div className="bg-card/40 px-2 sm:px-4 py-2 sm:py-4 rounded-xl sm:rounded-2xl border border-border flex items-center gap-2 sm:gap-3 hover:bg-card/60 transition-all lg:flex-1">
                                                <div className="p-1.5 sm:p-2.5 bg-chart-5/10 rounded-lg sm:rounded-xl text-chart-5">
                                                    <Activity className="w-4 h-4 sm:w-5 sm:h-5" />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-sm sm:text-xl font-black text-foreground leading-none">{activeSubLayers.length}</p>
                                                    <p className="text-[8px] sm:text-[10px] text-muted-foreground font-bold uppercase mt-0.5 sm:mt-1">{t.activeTasks}</p>
                                                </div>
                                            </div>

                                            <div className="lg:flex-1">
                                                <StreakFlame currentStreak={streak} language={language} />
                                            </div>
                                        </div>

                                        <div className="h-[200px] sm:h-[250px] lg:flex-1 lg:min-h-0 lg:h-auto">
                                            <GrowthChart
                                                data={logs.map(l => ({ date: l.created_at, points: l.ai_score }))}
                                                language={language}
                                                fillHeight
                                                embedded
                                                className="h-full"
                                            />
                                        </div>
                                    </div>
                                </TabsContent>

                                <TabsContent value="analytics" className="m-0 lg:h-full lg:min-h-0 focus-visible:ring-0 data-[state=inactive]:hidden">
                                    <div className="p-2.5 sm:p-3 lg:h-full lg:min-h-0 lg:overflow-y-auto scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
                                        <AdvancedAnalytics goalId={goal.id} language={language} />
                                    </div>
                                </TabsContent>

                                <TabsContent value="summary" className="m-0 lg:h-full lg:min-h-0 focus-visible:ring-0 data-[state=inactive]:hidden">
                                    <div className="p-2.5 sm:p-3 lg:h-full lg:min-h-0 lg:overflow-y-auto scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
                                        <WeeklySummaryCard goalId={goal.id} language={language} />
                                    </div>
                                </TabsContent>

                            </div>
                        </Tabs>
                    </div>
                </div>
            </div>

            {showLogModal && (
                <DailyLogModal
                    goal={goal}
                    tasks={activeSubLayers}
                    onClose={() => setShowLogModal(false)}
                    language={language}
                    onSuccess={() => {
                        fetchLogs(); // Refresh logs to update history/streak
                        onGoalUpdated?.();
                        setShowLogModal(false);
                        // Note: Goal points will update immediately now
                    }}
                />
            )}
            {/* Add Task Modal */}
            <Dialog open={showAddTask} onOpenChange={(open) => {
                setShowAddTask(open);
                if (!open) {
                    setNewTaskDescription('');
                    setNewTaskFrequency('daily');
                    setNewTaskWeight(5);
                }
            }}>
                <DialogContent className="sm:max-w-md bg-card border-border" dir={language === 'ar' ? 'rtl' : 'ltr'}>
                    <DialogHeader className={cn("space-y-2", language === 'ar' ? "text-right sm:text-right" : "text-left sm:text-left")}>
                        <DialogTitle className="text-xl font-black text-foreground">{language === 'ar' ? 'إضافة مهمة جديدة' : 'Add New Task'}</DialogTitle>
                        <p className="text-sm text-muted-foreground">{language === 'ar' ? 'أضف تفاصيل المهمة الجديدة إلى قائمة التركيز اليومي.' : 'Add new task details to your daily focus list.'}</p>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        {/* Description */}
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-foreground/80">{language === 'ar' ? 'وصف المهمة' : 'Task Description'}</label>
                            <Input
                                value={newTaskDescription}
                                onChange={(e) => setNewTaskDescription(e.target.value)}
                                placeholder={language === 'ar' ? 'اكتب وصف المهمة هنا...' : 'Enter task description...'}
                                className="h-12 rounded-xl bg-background border-input focus-visible:ring-primary text-base"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !addingTask) handleAddTask();
                                }}
                                autoFocus
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            {/* Frequency */}
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-foreground/80">{language === 'ar' ? 'التكرار' : 'Frequency'}</label>
                                <Select
                                    value={newTaskFrequency}
                                    onValueChange={(value: 'daily' | 'weekly' | 'monthly') => setNewTaskFrequency(value)}
                                >
                                    <SelectTrigger className="h-12 rounded-xl bg-background border-input font-medium" dir={language === 'ar' ? 'rtl' : 'ltr'}>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent dir={language === 'ar' ? 'rtl' : 'ltr'}>
                                        <SelectItem value="daily">{language === 'ar' ? 'يومي (Daily)' : 'Daily'}</SelectItem>
                                        <SelectItem value="weekly">{language === 'ar' ? 'أسبوعي (Weekly)' : 'Weekly'}</SelectItem>
                                        <SelectItem value="monthly">{language === 'ar' ? 'شهري (Monthly)' : 'Monthly'}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Weight */}
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-foreground/80">{language === 'ar' ? 'الأهمية (الوزن)' : 'Impact Weight'}</label>
                                <Select
                                    value={newTaskWeight.toString()}
                                    onValueChange={(value) => setNewTaskWeight(parseInt(value))}
                                >
                                    <SelectTrigger className="h-12 rounded-xl bg-background border-input font-medium" dir={language === 'ar' ? 'rtl' : 'ltr'}>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent dir={language === 'ar' ? 'rtl' : 'ltr'} className="max-h-[200px]">
                                        {Array.from({ length: 10 }, (_, i) => i + 1).map((num) => (
                                            <SelectItem key={num} value={num.toString()}>
                                                {num} - {num <= 3 ? (language === 'ar' ? 'منخفض' : 'Low') : num <= 7 ? (language === 'ar' ? 'متوسط' : 'Medium') : (language === 'ar' ? 'عالي' : 'High')}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>

                    <DialogFooter className={cn("gap-2 sm:gap-0", language === 'ar' ? "sm:justify-start" : "sm:justify-end")}>
                        <Button variant="outline" onClick={() => setShowAddTask(false)} className="rounded-xl h-11 px-6 font-bold">{t.cancel}</Button>
                        <Button
                            onClick={handleAddTask}
                            disabled={addingTask || !newTaskDescription.trim()}
                            className="rounded-xl h-11 px-8 font-bold text-primary-foreground bg-primary hover:bg-primary/90 shadow-md transition-all active:scale-95"
                        >
                            {addingTask && <Loader2 className={cn("w-4 h-4 animate-spin", language === 'ar' ? "ml-2" : "mr-2")} />}
                            {language === 'ar' ? 'إضافة المهمة' : 'Add Task'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
