'use client';

import { useMemo, useState } from 'react';
import { Plus, Trash2, Loader2, Calendar, Target, AlignLeft } from 'lucide-react';
import { format } from 'date-fns';
import { translations, type Language } from '@/lib/translations';
import { createClient } from '@/utils/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Calendar as ShadcnCalendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';

interface ManualGoalCreatorProps {
    onComplete: () => void;
    onCancel: () => void;
    language?: Language;
    initialData?: {
        title?: string;
        description?: string;
        targetPoints?: string;
    };
}

interface ManualSubtask {
    id: string;
    description: string;
    frequency: 'daily' | 'weekly';
    impact_weight: number;
    time_required_minutes: number;
    completion_criteria: string;
}

interface ManualMainTask {
    id: string;
    title: string;
    frequency: 'daily' | 'weekly';
    impact_weight: number;
    completion_criteria: string;
    subtasks: ManualSubtask[];
}

const makeId = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 9)}`;

const createSubtask = (): ManualSubtask => ({
    id: makeId('sub'),
    description: '',
    frequency: 'daily',
    impact_weight: 3,
    time_required_minutes: 20,
    completion_criteria: '',
});

const createMainTask = (): ManualMainTask => ({
    id: makeId('main'),
    title: '',
    frequency: 'weekly',
    impact_weight: 6,
    completion_criteria: '',
    subtasks: [createSubtask()],
});

export default function ManualGoalCreator({ onComplete, onCancel, language = 'en', initialData }: ManualGoalCreatorProps) {
    const supabase = createClient();
    const [goalTitle, setGoalTitle] = useState(initialData?.title || '');
    const [goalDescription, setGoalDescription] = useState(initialData?.description || '');
    const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [endDate, setEndDate] = useState(format(new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'));
    const [targetPoints, setTargetPoints] = useState(initialData?.targetPoints || '10000');
    const [mainTasks, setMainTasks] = useState<ManualMainTask[]>([createMainTask()]);
    const [loading, setLoading] = useState(false);

    const t = translations[language];

    const goalDays = useMemo(() => {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const diff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        return Math.max(1, diff);
    }, [startDate, endDate]);

    const updateMain = (id: string, patch: Partial<ManualMainTask>) => {
        setMainTasks(prev => prev.map(task => task.id === id ? { ...task, ...patch } : task));
    };

    const removeMain = (id: string) => {
        setMainTasks(prev => prev.filter(task => task.id !== id));
    };

    const addMain = () => setMainTasks(prev => [...prev, createMainTask()]);

    const addSub = (mainId: string) => {
        setMainTasks(prev => prev.map(task => (
            task.id === mainId
                ? { ...task, subtasks: [...task.subtasks, createSubtask()] }
                : task
        )));
    };

    const updateSub = (mainId: string, subId: string, patch: Partial<ManualSubtask>) => {
        setMainTasks(prev => prev.map(task => {
            if (task.id !== mainId) return task;
            return {
                ...task,
                subtasks: task.subtasks.map(sub => sub.id === subId ? { ...sub, ...patch } : sub),
            };
        }));
    };

    const removeSub = (mainId: string, subId: string) => {
        setMainTasks(prev => prev.map(task => {
            if (task.id !== mainId) return task;
            return { ...task, subtasks: task.subtasks.filter(sub => sub.id !== subId) };
        }));
    };

    const handleSubmit = async () => {
        const validMainTasks = mainTasks.filter(main => main.title.trim());
        if (!goalTitle.trim() || !startDate || !endDate || validMainTasks.length === 0) {
            alert(language === 'ar'
                ? 'يرجى إدخال عنوان الهدف والتواريخ ومهمة رئيسية واحدة على الأقل.'
                : 'Please provide goal title, dates, and at least one main task.');
            return;
        }

        setLoading(true);
        try {
            const { data: { user }, error: userError } = await supabase.auth.getUser();
            if (userError || !user?.id) {
                throw new Error(language === 'ar' ? 'يرجى تسجيل الدخول أولاً' : 'Please sign in first');
            }

            const { data: goal, error: goalError } = await supabase
                .from('goals')
                .insert({
                    user_id: user.id,
                    title: goalTitle.trim(),
                    target_points: Math.max(1000, Number(targetPoints) || 10000),
                    current_points: 0,
                    status: 'active',
                    created_at: new Date(startDate).toISOString(),
                    estimated_completion_date: new Date(endDate).toISOString(),
                    total_days: goalDays,
                    ai_summary: goalDescription.trim() || (language === 'ar' ? 'هدف مُدخل يدوياً' : 'Manual goal'),
                })
                .select()
                .single();

            if (goalError) throw goalError;

            for (let mainIndex = 0; mainIndex < validMainTasks.length; mainIndex++) {
                const main = validMainTasks[mainIndex];
                const { data: insertedMain, error: mainError } = await supabase
                    .from('sub_layers')
                    .insert({
                        goal_id: goal.id,
                        task_description: main.title.trim(),
                        frequency: main.frequency,
                        impact_weight: Math.max(1, Math.min(10, Number(main.impact_weight) || 1)),
                        completion_criteria: main.completion_criteria.trim() || null,
                        time_required_minutes: 0,
                        task_type: 'main',
                        parent_task_id: null,
                        sort_order: mainIndex,
                    })
                    .select('id')
                    .single();

                if (mainError) throw mainError;

                const validSubtasks = main.subtasks.filter(sub => sub.description.trim());
                if (validSubtasks.length === 0) continue;

                const subRows = validSubtasks.map((sub, subIndex) => ({
                    goal_id: goal.id,
                    task_description: sub.description.trim(),
                    frequency: sub.frequency,
                    impact_weight: Math.max(1, Math.min(5, Number(sub.impact_weight) || 1)),
                    completion_criteria: sub.completion_criteria.trim() || null,
                    time_required_minutes: Math.max(0, Number(sub.time_required_minutes) || 0),
                    task_type: 'sub',
                    parent_task_id: insertedMain.id,
                    sort_order: subIndex,
                }));

                const { error: subError } = await supabase.from('sub_layers').insert(subRows);
                if (subError) throw subError;
            }

            onComplete();
        } catch (error: any) {
            console.error('Error creating goal:', error);
            alert(language === 'ar'
                ? `فشل في إنشاء الهدف: ${error.message || 'Unknown error'}`
                : `Failed to create goal: ${error.message || 'Unknown error'}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 max-w-full overflow-x-hidden p-1 sm:p-2">
            <div>
                <h2 className="text-2xl sm:text-3xl font-black text-foreground mb-2">
                    {language === 'ar' ? 'إضافة هدف يدويًا' : 'Manual Goal Creation'}
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground">
                    {language === 'ar' ? 'حدد التفاصيل والمهام الرئيسية والفرعية' : 'Define details with main tasks and subtasks'}
                </p>
            </div>

            <div className="space-y-4">
                <div className="space-y-2">
                    <label className="text-sm font-bold text-foreground">
                        {language === 'ar' ? 'اسم الهدف' : 'Goal Title'}
                    </label>
                    <input
                        type="text"
                        value={goalTitle}
                        onChange={(e) => setGoalTitle(e.target.value)}
                        placeholder={language === 'ar' ? 'مثال: إتقان بايثون' : 'Example: Master Python'}
                        className="w-full p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border-2 border-border focus:border-primary bg-muted/30 text-foreground placeholder:text-muted-foreground transition-all text-sm sm:text-base"
                        dir={language === 'ar' ? 'rtl' : 'ltr'}
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-bold text-foreground flex items-center gap-2">
                        <AlignLeft className="w-4 h-4" />
                        {language === 'ar' ? 'وصف الهدف' : 'Goal Description'}
                    </label>
                    <Textarea
                        value={goalDescription}
                        onChange={(e) => setGoalDescription(e.target.value)}
                        placeholder={language === 'ar' ? 'وصف مختصر...' : 'Short description...'}
                        className="w-full min-h-[90px] p-3.5 rounded-xl border-2 border-border focus:border-primary bg-muted/30"
                        dir={language === 'ar' ? 'rtl' : 'ltr'}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
                <div className="space-y-2">
                    <label className="text-xs sm:text-sm font-bold text-foreground flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        {language === 'ar' ? 'تاريخ البدء' : 'Start Date'}
                    </label>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className="w-full justify-start text-left font-normal">
                                <Calendar className="h-4 w-4 mr-2" />
                                {startDate ? format(new Date(startDate), 'PPP') : 'Select date'}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                            <ShadcnCalendar
                                mode="single"
                                selected={startDate ? new Date(startDate) : undefined}
                                onSelect={(date) => setStartDate(date ? format(date, 'yyyy-MM-dd') : '')}
                                initialFocus
                            />
                        </PopoverContent>
                    </Popover>
                </div>

                <div className="space-y-2">
                    <label className="text-xs sm:text-sm font-bold text-foreground flex items-center gap-2">
                        <Target className="w-4 h-4" />
                        {language === 'ar' ? 'تاريخ الانتهاء' : 'End Date'}
                    </label>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className="w-full justify-start text-left font-normal">
                                <Calendar className="h-4 w-4 mr-2" />
                                {endDate ? format(new Date(endDate), 'PPP') : 'Select date'}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                            <ShadcnCalendar
                                mode="single"
                                selected={endDate ? new Date(endDate) : undefined}
                                onSelect={(date) => setEndDate(date ? format(date, 'yyyy-MM-dd') : '')}
                                initialFocus
                            />
                        </PopoverContent>
                    </Popover>
                </div>

                <div className="space-y-2 sm:col-span-2 md:col-span-1">
                    <label className="text-xs sm:text-sm font-bold text-foreground">
                        {language === 'ar' ? 'النقاط المستهدفة' : 'Target Points'}
                    </label>
                    <Input
                        type="number"
                        value={targetPoints}
                        onChange={(e) => setTargetPoints(e.target.value)}
                        className="h-11"
                    />
                </div>
            </div>

            <div className="space-y-3 bg-muted/10 p-3 sm:p-5 rounded-2xl border border-border/50">
                <div className="flex items-center justify-between">
                    <h3 className="text-base sm:text-lg font-bold text-foreground">
                        {language === 'ar' ? 'المهام الرئيسية والفرعية' : 'Main Tasks & Subtasks'}
                    </h3>
                    <button
                        onClick={addMain}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs sm:text-sm font-semibold"
                    >
                        <Plus className="w-4 h-4" />
                        {language === 'ar' ? 'إضافة رئيسية' : 'Add Main'}
                    </button>
                </div>

                <div className="space-y-3">
                    {mainTasks.map((main) => (
                        <div key={main.id} className="rounded-xl border border-border bg-card p-3 space-y-3">
                            <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto_auto] gap-2 items-center">
                                <input
                                    value={main.title}
                                    onChange={(e) => updateMain(main.id, { title: e.target.value })}
                                    placeholder={language === 'ar' ? 'المهمة الرئيسية' : 'Main task'}
                                    className="p-2.5 rounded-lg border border-border bg-background text-sm"
                                />
                                <select
                                    value={main.frequency}
                                    onChange={(e) => updateMain(main.id, { frequency: e.target.value as 'daily' | 'weekly' })}
                                    className="p-2.5 rounded-lg border border-border bg-background text-sm"
                                >
                                    <option value="daily">{language === 'ar' ? 'يومي' : 'Daily'}</option>
                                    <option value="weekly">{language === 'ar' ? 'أسبوعي' : 'Weekly'}</option>
                                </select>
                                <input
                                    type="number"
                                    min={1}
                                    max={10}
                                    value={main.impact_weight}
                                    onChange={(e) => updateMain(main.id, { impact_weight: Number(e.target.value) || 1 })}
                                    className="w-20 p-2.5 rounded-lg border border-border bg-background text-sm"
                                />
                                <button
                                    onClick={() => removeMain(main.id)}
                                    className="p-2 rounded-lg hover:bg-destructive/10 text-destructive"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>

                            <input
                                value={main.completion_criteria}
                                onChange={(e) => updateMain(main.id, { completion_criteria: e.target.value })}
                                placeholder={language === 'ar' ? 'معيار الإنجاز (اختياري)' : 'Completion criteria (optional)'}
                                className="w-full p-2.5 rounded-lg border border-border bg-background text-sm"
                            />

                            <div className="space-y-2">
                                {main.subtasks.map((sub) => (
                                    <div key={sub.id} className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto_auto_auto] gap-2 items-center ps-3 border-s border-border">
                                        <input
                                            value={sub.description}
                                            onChange={(e) => updateSub(main.id, sub.id, { description: e.target.value })}
                                            placeholder={language === 'ar' ? 'المهمة الفرعية' : 'Subtask'}
                                            className="p-2 rounded-lg border border-border bg-background text-xs sm:text-sm"
                                        />
                                        <select
                                            value={sub.frequency}
                                            onChange={(e) => updateSub(main.id, sub.id, { frequency: e.target.value as 'daily' | 'weekly' })}
                                            className="p-2 rounded-lg border border-border bg-background text-xs sm:text-sm"
                                        >
                                            <option value="daily">{language === 'ar' ? 'يومي' : 'Daily'}</option>
                                            <option value="weekly">{language === 'ar' ? 'أسبوعي' : 'Weekly'}</option>
                                        </select>
                                        <input
                                            type="number"
                                            min={1}
                                            max={5}
                                            value={sub.impact_weight}
                                            onChange={(e) => updateSub(main.id, sub.id, { impact_weight: Number(e.target.value) || 1 })}
                                            className="w-16 p-2 rounded-lg border border-border bg-background text-xs sm:text-sm"
                                        />
                                        <input
                                            type="number"
                                            min={0}
                                            value={sub.time_required_minutes}
                                            onChange={(e) => updateSub(main.id, sub.id, { time_required_minutes: Number(e.target.value) || 0 })}
                                            className="w-20 p-2 rounded-lg border border-border bg-background text-xs sm:text-sm"
                                            placeholder="min"
                                        />
                                        <button
                                            onClick={() => removeSub(main.id, sub.id)}
                                            className="p-2 rounded-lg hover:bg-destructive/10 text-destructive"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>

                            <button
                                onClick={() => addSub(main.id)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted text-xs"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                {language === 'ar' ? 'إضافة فرعية' : 'Add Subtask'}
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            <div className="flex gap-3 pt-2">
                <button
                    onClick={onCancel}
                    className="flex-1 py-3 bg-muted text-foreground rounded-xl font-bold hover:bg-muted/80 transition-all text-sm"
                >
                    {t.cancel}
                </button>
                <button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="flex-[2] py-3 bg-primary text-primary-foreground rounded-xl font-bold hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
                >
                    {loading ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
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
