'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Target, TrendingUp, Calendar, CheckCircle, Plus, Activity, Pencil, Trash2, MoreVertical, Eye, X, Pin, PinOff, Clock, Loader2 } from 'lucide-react';
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
                        else {
                            // Update the prop object reference just in case
                            goal.current_points = calculatedTotal;
                            if (onGoalUpdated) onGoalUpdated();
                        }
                    });
            }
        }
    };

    const calculateStreak = (logsData: Log[]) => {
        if (!logsData.length) {
            setStreak(0);
            return;
        }

        // Get unique dates YYYY-MM-DD
        const uniqueDates = Array.from(new Set(logsData.map(l => new Date(l.created_at).toISOString().split('T')[0]))).sort().reverse();

        if (uniqueDates.length === 0) {
            setStreak(0);
            return;
        }

        const today = new Date().toISOString().split('T')[0];
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

        // If no log today or yesterday, streak is broken (0)
        // BUT: If the user just started and has logs, maybe we shouldn't zero it immediately? 
        // Strict rule: Must have logged today or yesterday to keep streak alive.
        if (uniqueDates[0] !== today && uniqueDates[0] !== yesterday) {
            setStreak(0);
            return;
        }

        let currentStreak = 1;
        let lastDate = new Date(uniqueDates[0]);

        for (let i = 1; i < uniqueDates.length; i++) {
            const currentDate = new Date(uniqueDates[i]);
            const diffTime = Math.abs(lastDate.getTime() - currentDate.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays === 1) {
                currentStreak++;
                lastDate = currentDate;
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
            // Update local goal object
            goal.title = editedGoalName;
            goal.icon = editedGoalIcon;
            setIsEditingGoalName(false);
            // Trigger parent refresh if needed
            // window.location.reload();
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

            // Update local state and reload to reflect changes in sidebar/dock
            goal.is_pinned = !goal.is_pinned;
            // window.location.reload();
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

    if (loading && !goal) { // Only full page load if goal is missing, otherwise we might just be refreshing data
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="space-y-2 animate-in fade-in duration-500">

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-2 items-stretch">

                {/* LEFT: PROGRESS & STATS */}
                <div className={cn("lg:col-span-2 flex flex-col h-full min-h-0 space-y-2", isArabic && "lg:order-2")}>
                    {/* MASTER PIPE (PROGRESS BAR) */}
                    <div className="bg-card/30 backdrop-blur-xl p-5 rounded-[28px] shadow-2xl border border-border relative overflow-hidden ring-1 ring-border/5">
                        {/* Header: Title, Icon and Dropdown */}
                        <div className="flex items-center justify-between gap-4 mb-4">
                            {isEditingGoalName ? (
                                <div className="flex-1 flex flex-col sm:flex-row gap-2">
                                    <div className="flex gap-2 flex-1">
                                        <IconPicker
                                            selectedIcon={editedGoalIcon}
                                            onSelectIcon={setEditedGoalIcon}
                                            className="h-[52px] w-[52px] shrink-0"
                                        />
                                        <input
                                            type="text"
                                            value={editedGoalName}
                                            onChange={(e) => setEditedGoalName(e.target.value)}
                                            className="flex-1 text-2xl font-black text-foreground bg-muted/50 border-2 border-primary rounded-xl px-4 py-2 focus:outline-none focus:border-primary min-w-0"
                                            dir={goalTitleRTL ? 'rtl' : 'ltr'}
                                            autoFocus
                                            onKeyPress={(e) => {
                                                if (e.key === 'Enter') {
                                                    handleSaveGoalDetails();
                                                }
                                            }}
                                        />
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={handleSaveGoalDetails}
                                            className="px-4 py-2 bg-primary text-primary-foreground rounded-xl font-bold hover:opacity-90 transition-all flex items-center justify-center flex-1 sm:flex-none"
                                        >
                                            <CheckCircle className="w-5 h-5" />
                                        </button>
                                        <button
                                            onClick={() => {
                                                setIsEditingGoalName(false);
                                                setEditedGoalName(goal.title);
                                                setEditedGoalIcon(goal.icon || 'Target');
                                            }}
                                            className="px-4 py-2 bg-muted text-foreground rounded-xl font-bold hover:bg-muted/80 transition-all flex items-center justify-center flex-1 sm:flex-none"
                                        >
                                            <X className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center gap-4 flex-1 min-w-0">
                                    <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
                                        <GoalIcon className="w-6 h-6" />
                                    </div>
                                    <h2
                                        className="text-3xl font-black text-foreground tracking-tight flex-1 truncate"
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
                        <div className="space-y-2">
                            <div className="relative h-10 w-full bg-muted/50 rounded-2xl overflow-hidden border border-border shadow-inner">
                                <div
                                    className="h-full bg-gradient-to-r from-primary via-primary/80 to-chart-1 transition-all duration-1000 ease-out relative shadow-[0_0_20px_var(--primary)] opacity-90"
                                    style={{ width: `${Math.min(100, progressPercent)}%` }}
                                >
                                    {/* Liquid Effect */}
                                    <div className="absolute inset-0 opacity-30 bg-[url('https://www.transparenttextures.com/patterns/waves.png')] animate-pulse"></div>
                                    <div className="absolute top-0 start-0 w-full h-1/2 bg-white/20"></div>
                                </div>

                                {/* Percentage Text - Centered */}
                                <div className="absolute inset-0 flex items-center justify-center z-10">
                                    <span className="text-lg font-black text-foreground/80 drop-shadow-sm bg-background/20 backdrop-blur-[2px] px-3 py-0.5 rounded-lg border border-white/10">
                                        {progressPercent}%
                                    </span>
                                </div>
                            </div>

                            <div
                                className={cn(
                                    "flex items-center justify-between text-xs text-muted-foreground px-2 font-bold tabular-nums",
                                    !isArabic && "uppercase tracking-wider"
                                )}
                            >
                                <span className="whitespace-nowrap">{currentPoints.toLocaleString()} {t.points}</span>
                                <span className="whitespace-nowrap">{targetPoints.toLocaleString()} {t.points}</span>
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

                    {/* GROWTH CHART */}
                    {/* GrowthChart component needs a separate refactor, but for now it sits here. Layout wrapper is handled above */}
                    <div className="flex-1 min-h-0">
                        <GrowthChart
                            data={logs.map(l => ({ date: l.created_at, points: l.ai_score }))}
                            language={language}
                            fillHeight
                        />
                    </div>

                    {/* ADVANCED ANALYTICS */}
                    <AdvancedAnalytics goalId={goal.id} language={language} />

                    {/* WEEKLY SUMMARY */}
                    <WeeklySummaryCard goalId={goal.id} language={language} />

                    {/* QUICK STATS & STREAK */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="bg-card/50 px-4 py-3 rounded-3xl border border-border shadow-lg flex items-center gap-3 hover:bg-card/80 transition-all">
                            <div className="p-2.5 bg-chart-2/10 rounded-2xl text-chart-2 ring-1 ring-chart-2/20">
                                <TrendingUp className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-xl font-bold text-foreground leading-tight">{currentPoints.toLocaleString()}</p>
                                <p className="text-[10px] text-muted-foreground font-bold uppercase">{t.totalPoints}</p>
                            </div>
                        </div>

                        <div className="bg-card/50 px-4 py-3 rounded-3xl border border-border shadow-lg flex items-center gap-3 hover:bg-card/80 transition-all">
                            <div className="p-2.5 bg-chart-5/10 rounded-2xl text-chart-5 ring-1 ring-chart-5/20">
                                <Activity className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-xl font-bold text-foreground leading-tight">{activeSubLayers.length}</p>
                                <p className="text-[10px] text-muted-foreground font-bold uppercase">{t.activeTasks}</p>
                            </div>
                        </div>

                        {/* STREAK FLAME */}
                        <StreakFlame currentStreak={streak} language={language} />
                    </div>
                </div>

                {/* RIGHT: SUB-LAYERS (TASKS) & ACTIVITY */}
                <div className={cn("space-y-2 h-full min-h-0", isArabic && "lg:order-1")}>

                    {/* DAILY FOCUS LIST */}
                    <div className="bg-card/30 backdrop-blur-xl p-5 rounded-[28px] shadow-2xl border border-border relative overflow-hidden ring-1 ring-border/5 space-y-4">
                        <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
                            <CheckCircle className="w-6 h-6 text-chart-2" /> {t.dailyFocus}
                        </h3>
                        <div className="space-y-3 max-h-[320px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
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

                        {/* ADD TASK SECTION */}
                        {showAddTask ? (
                            <div className="animate-in fade-in slide-in-from-top-2 duration-200 space-y-3 p-4 bg-card/50 rounded-2xl border border-primary/20">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-sm font-bold text-foreground">
                                        {language === 'ar' ? 'إضافة مهمة جديدة' : 'Add New Task'}
                                    </h4>
                                    <button
                                        onClick={() => {
                                            setShowAddTask(false);
                                            setNewTaskDescription('');
                                            setNewTaskFrequency('daily');
                                            setNewTaskWeight(5);
                                        }}
                                        className="p-1 hover:bg-muted rounded-lg transition-colors text-muted-foreground hover:text-foreground"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                                
                                {/* Task Description */}
                                <input
                                    type="text"
                                    value={newTaskDescription}
                                    onChange={(e) => setNewTaskDescription(e.target.value)}
                                    placeholder={language === 'ar' ? 'وصف المهمة...' : 'Task description...'}
                                    className="w-full p-3 rounded-xl border-2 border-border focus:border-primary bg-muted/30 text-foreground placeholder:text-muted-foreground transition-all text-sm"
                                    dir={language === 'ar' ? 'rtl' : 'ltr'}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !addingTask) handleAddTask();
                                    }}
                                    autoFocus
                                />

                                {/* Frequency & Weight */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <label className="text-xs text-muted-foreground font-medium">
                                            {language === 'ar' ? 'التكرار' : 'Frequency'}
                                        </label>
                                        <select
                                            value={newTaskFrequency}
                                            onChange={(e) => setNewTaskFrequency(e.target.value as 'daily' | 'weekly' | 'monthly')}
                                            className="w-full p-2 rounded-lg border border-border bg-muted/30 text-foreground text-sm"
                                        >
                                            <option value="daily">{language === 'ar' ? 'يومي' : 'Daily'}</option>
                                            <option value="weekly">{language === 'ar' ? 'أسبوعي' : 'Weekly'}</option>
                                            <option value="monthly">{language === 'ar' ? 'شهري' : 'Monthly'}</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs text-muted-foreground font-medium">
                                            {language === 'ar' ? 'الوزن (1-10)' : 'Weight (1-10)'}
                                        </label>
                                        <input
                                            type="number"
                                            min="1"
                                            max="10"
                                            value={newTaskWeight}
                                            onChange={(e) => setNewTaskWeight(Math.min(10, Math.max(1, parseInt(e.target.value) || 1)))}
                                            className="w-full p-2 rounded-lg border border-border bg-muted/30 text-foreground text-sm"
                                        />
                                    </div>
                                </div>

                                {/* Save Button */}
                                <button
                                    onClick={handleAddTask}
                                    disabled={addingTask || !newTaskDescription.trim()}
                                    className="w-full py-2.5 bg-chart-2 hover:bg-chart-2/90 text-white rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {addingTask ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <>
                                            <Plus className="w-4 h-4" />
                                            {language === 'ar' ? 'إضافة المهمة' : 'Add Task'}
                                        </>
                                    )}
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={() => setShowAddTask(true)}
                                className="w-full py-2.5 border-2 border-dashed border-border hover:border-primary/40 text-muted-foreground hover:text-primary rounded-2xl font-medium text-sm transition-all flex items-center justify-center gap-2"
                            >
                                <Plus className="w-4 h-4" />
                                {language === 'ar' ? 'إضافة مهمة جديدة' : 'Add New Task'}
                            </button>
                        )}

                        {/* DAILY LOG BUTTON */}
                        <button
                            onClick={() => setShowLogModal(true)}
                            className="w-full py-3.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-2xl font-bold text-base shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
                        >
                            <Plus className="w-5 h-5" /> {t.logProgressButton}
                        </button>
                    </div>

                    {/* ACTIVITY HISTORY */}
                    <div className="space-y-4">
                        <ActivityHistory logs={logs} language={language} onLogDeleted={fetchLogs} />
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
        </div>
    );
}
