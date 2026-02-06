'use client';

import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Calendar, Target, Loader2 } from 'lucide-react';
import { translations, type Language } from '@/lib/translations';
import { createClient } from '@/utils/supabase/client';

interface ManualGoalCreatorProps {
    onComplete: () => void;
    onCancel: () => void;
    language?: Language;
    initialData?: {
        title?: string;
        targetPoints?: string;
        estimatedDays?: number;
        tasks?: Task[];
    };
}

interface Task {
    id: string;
    description: string;
    frequency: 'daily' | 'weekly' | 'monthly';
    impact_weight: number;
}

export default function ManualGoalCreator({ onComplete, onCancel, language = 'en', initialData }: ManualGoalCreatorProps) {
    const t = translations[language];
    const supabase = createClient();
    
    const [goalTitle, setGoalTitle] = useState(initialData?.title || '');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [targetPoints, setTargetPoints] = useState(initialData?.targetPoints || '10000');
    const [tasks, setTasks] = useState<Task[]>(initialData?.tasks || []);
    const [newTaskDesc, setNewTaskDesc] = useState('');
    const [loading, setLoading] = useState(false);

    // Set dates based on estimated days if provided
    useEffect(() => {
        if (initialData?.estimatedDays) {
            const today = new Date();
            const start = today.toISOString().split('T')[0];
            const end = new Date(today.getTime() + initialData.estimatedDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            setStartDate(start);
            setEndDate(end);
        }
    }, [initialData]);

    const addTask = () => {
        if (!newTaskDesc.trim()) return;
        
        const newTask: Task = {
            id: Date.now().toString(),
            description: newTaskDesc,
            frequency: 'daily',
            impact_weight: 5
        };
        
        setTasks([...tasks, newTask]);
        setNewTaskDesc('');
    };

    const removeTask = (id: string) => {
        setTasks(tasks.filter(t => t.id !== id));
    };

    const updateTask = (id: string, field: keyof Task, value: any) => {
        setTasks(tasks.map(t => t.id === id ? { ...t, [field]: value } : t));
    };

    const handleSubmit = async () => {
        if (!goalTitle.trim() || !startDate || !endDate || tasks.length === 0) {
            alert(language === 'ar' ? 'يرجى ملء جميع الحقول وإضافة مهمة واحدة على الأقل' : 'Please fill all fields and add at least one task');
            return;
        }

        setLoading(true);

        try {
            const start = new Date(startDate);
            const end = new Date(endDate);
            const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

            // Create goal
            const { data: goal, error: goalError } = await supabase
                .from('goals')
                .insert({
                    title: goalTitle,
                    target_points: parseInt(targetPoints),
                    current_points: 0,
                    status: 'active',
                    created_at: start.toISOString(),
                    estimated_completion_date: end.toISOString(),
                    total_days: totalDays,
                    ai_summary: language === 'ar' ? 'هدف تم إنشاؤه يدوياً' : 'Manually created goal'
                })
                .select()
                .single();

            if (goalError) throw goalError;

            // Create tasks
            const tasksToInsert = tasks.map(task => ({
                goal_id: goal.id,
                task_description: task.description,
                frequency: task.frequency,
                impact_weight: task.impact_weight
            }));

            console.log('Inserting tasks:', tasksToInsert);

            const { data: insertedTasks, error: tasksError } = await supabase
                .from('sub_layers')
                .insert(tasksToInsert)
                .select();

            if (tasksError) {
                console.error('Tasks insert error:', tasksError);
                throw tasksError;
            }

            console.log('Tasks created successfully:', insertedTasks);
            onComplete();
        } catch (error: any) {
            console.error('Error creating goal:', error);
            const errorMessage = error?.message || error?.error_description || 'Unknown error';
            alert(language === 'ar' 
                ? `فشل في إنشاء الهدف: ${errorMessage}` 
                : `Failed to create goal: ${errorMessage}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-card/30 backdrop-blur-xl p-8 rounded-[32px] border border-border ring-1 ring-border/5 shadow-2xl space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-black text-foreground mb-2">
                        {language === 'ar' ? 'إضافة هدف يدوياً' : 'Manual Goal Creation'}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                        {language === 'ar' ? 'حدد تفاصيل هدفك والمهام المطلوبة' : 'Define your goal details and required tasks'}
                    </p>
                </div>
                <button onClick={onCancel} className="p-2 hover:bg-muted rounded-full transition-colors">
                    <X className="w-6 h-6 text-muted-foreground" />
                </button>
            </div>

            {/* Goal Title */}
            <div className="space-y-2">
                <label className="text-sm font-bold text-foreground">
                    {language === 'ar' ? 'اسم الهدف' : 'Goal Title'}
                </label>
                <input
                    type="text"
                    value={goalTitle}
                    onChange={(e) => setGoalTitle(e.target.value)}
                    placeholder={language === 'ar' ? 'مثال: إتقان برمجة بايثون' : 'Example: Master Python Programming'}
                    className="w-full p-4 rounded-2xl border-2 border-border focus:border-primary bg-muted/30 text-foreground placeholder:text-muted-foreground transition-all"
                    dir={language === 'ar' ? 'rtl' : 'ltr'}
                />
            </div>

            {/* Dates and Points */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                    <label className="text-sm font-bold text-foreground flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        {language === 'ar' ? 'تاريخ البدء' : 'Start Date'}
                    </label>
                    <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full p-3 rounded-xl border-2 border-border focus:border-primary bg-muted/30 text-foreground transition-all"
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-bold text-foreground flex items-center gap-2">
                        <Target className="w-4 h-4" />
                        {language === 'ar' ? 'تاريخ الانتهاء' : 'End Date'}
                    </label>
                    <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full p-3 rounded-xl border-2 border-border focus:border-primary bg-muted/30 text-foreground transition-all"
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-bold text-foreground">
                        {language === 'ar' ? 'النقاط المستهدفة' : 'Target Points'}
                    </label>
                    <input
                        type="number"
                        value={targetPoints}
                        onChange={(e) => setTargetPoints(e.target.value)}
                        className="w-full p-3 rounded-xl border-2 border-border focus:border-primary bg-muted/30 text-foreground transition-all"
                    />
                </div>
            </div>

            {/* Tasks Section */}
            <div className="space-y-4">
                <h3 className="text-lg font-bold text-foreground">
                    {language === 'ar' ? 'المهام اليومية' : 'Daily Tasks'}
                </h3>

                {/* Add Task Input */}
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={newTaskDesc}
                        onChange={(e) => setNewTaskDesc(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && addTask()}
                        placeholder={language === 'ar' ? 'أضف مهمة جديدة...' : 'Add a new task...'}
                        className="flex-1 p-3 rounded-xl border-2 border-border focus:border-primary bg-muted/30 text-foreground placeholder:text-muted-foreground transition-all"
                        dir={language === 'ar' ? 'rtl' : 'ltr'}
                    />
                    <button
                        onClick={addTask}
                        className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-bold hover:opacity-90 transition-all flex items-center gap-2"
                    >
                        <Plus className="w-5 h-5" />
                        {language === 'ar' ? 'إضافة' : 'Add'}
                    </button>
                </div>

                {/* Tasks List */}
                <div className="space-y-3">
                    {tasks.map((task) => (
                        <div key={task.id} className="bg-card/50 p-4 rounded-xl border border-border space-y-3">
                            <div className="flex items-start justify-between gap-3">
                                <p className="flex-1 text-foreground font-medium">{task.description}</p>
                                <button
                                    onClick={() => removeTask(task.id)}
                                    className="p-2 hover:bg-destructive/10 text-destructive rounded-lg transition-colors"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-xs text-muted-foreground">
                                        {language === 'ar' ? 'التكرار' : 'Frequency'}
                                    </label>
                                    <select
                                        value={task.frequency}
                                        onChange={(e) => updateTask(task.id, 'frequency', e.target.value)}
                                        className="w-full p-2 rounded-lg border border-border bg-muted/30 text-foreground text-sm"
                                    >
                                        <option value="daily">{language === 'ar' ? 'يومي' : 'Daily'}</option>
                                        <option value="weekly">{language === 'ar' ? 'أسبوعي' : 'Weekly'}</option>
                                        <option value="monthly">{language === 'ar' ? 'شهري' : 'Monthly'}</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs text-muted-foreground">
                                        {language === 'ar' ? 'الوزن (1-10)' : 'Weight (1-10)'}
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="10"
                                        value={task.impact_weight}
                                        onChange={(e) => updateTask(task.id, 'impact_weight', parseInt(e.target.value))}
                                        className="w-full p-2 rounded-lg border border-border bg-muted/30 text-foreground text-sm"
                                    />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {tasks.length === 0 && (
                    <div className="text-center p-8 bg-muted/20 rounded-xl border border-dashed border-border">
                        <p className="text-muted-foreground text-sm">
                            {language === 'ar' ? 'لم تضف أي مهام بعد' : 'No tasks added yet'}
                        </p>
                    </div>
                )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
                <button
                    onClick={onCancel}
                    className="flex-1 py-4 bg-muted text-foreground rounded-2xl font-bold hover:bg-muted/80 transition-all"
                >
                    {language === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                    onClick={handleSubmit}
                    disabled={loading || !goalTitle || !startDate || !endDate || tasks.length === 0}
                    className="flex-1 py-4 bg-primary text-primary-foreground rounded-2xl font-bold hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    {loading ? (
                        <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            {language === 'ar' ? 'جاري الإنشاء...' : 'Creating...'}
                        </>
                    ) : (
                        language === 'ar' ? 'إنشاء الهدف' : 'Create Goal'
                    )}
                </button>
            </div>
        </div>
    );
}
