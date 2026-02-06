'use client';

import { useState } from 'react';
import { Target, Sparkles, Plus, Calendar, Pin } from 'lucide-react';
import { translations, type Language } from '@/lib/translations';
import GoalCreator from './GoalCreator';
import ManualGoalCreator from './ManualGoalCreator';
import GoalTemplates, { type GoalTemplate } from './GoalTemplates';
import Image from 'next/image';
import { getIconComponent } from './IconPicker';

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

interface HomePageProps {
    goals: Goal[];
    onGoalCreated: () => void;
    onSelectGoal: (id: string) => void;
    language?: Language;
}

export default function HomePage({ goals, onGoalCreated, onSelectGoal, language = 'en' }: HomePageProps) {
    const t = translations[language];
    const [creationMode, setCreationMode] = useState<'none' | 'ai' | 'manual' | 'template'>('none');
    const [selectedTemplate, setSelectedTemplate] = useState<GoalTemplate | null>(null);

    const isArabic = language === 'ar';
    const recentGoals = goals.slice(0, 3);

    const isRTL = (text: string) => {
        const arabicRegex = /[\u0600-\u06ff]/;
        return arabicRegex.test(text);
    };

    if (creationMode === 'ai') {
        return (
            <div className="w-full max-w-3xl animate-in fade-in zoom-in-95 duration-500">
                <GoalCreator
                    onComplete={() => {
                        onGoalCreated();
                        setCreationMode('none');
                    }}
                    onCancel={() => setCreationMode('none')}
                    language={language}
                />
            </div>
        );
    }

    if (creationMode === 'manual') {
        return (
            <div className="w-full max-w-3xl animate-in fade-in zoom-in-95 duration-500">
                <ManualGoalCreator
                    onComplete={() => {
                        onGoalCreated();
                        setCreationMode('none');
                    }}
                    onCancel={() => setCreationMode('none')}
                    language={language}
                />
            </div>
        );
    }

    if (creationMode === 'template' && selectedTemplate) {
        return (
            <div className="w-full max-w-3xl animate-in fade-in zoom-in-95 duration-500">
                <ManualGoalCreator
                    onComplete={() => {
                        onGoalCreated();
                        setCreationMode('none');
                        setSelectedTemplate(null);
                    }}
                    onCancel={() => {
                        setCreationMode('none');
                        setSelectedTemplate(null);
                    }}
                    language={language}
                    initialData={{
                        title: language === 'ar' ? selectedTemplate.titleAr : selectedTemplate.titleEn,
                        targetPoints: selectedTemplate.targetPoints.toString(),
                        estimatedDays: selectedTemplate.estimatedDays,
                        tasks: selectedTemplate.tasks.map((t, idx) => ({
                            id: `template-${idx}`,
                            description: t.task,
                            frequency: t.frequency as 'daily' | 'weekly' | 'monthly',
                            impact_weight: t.impact_weight
                        }))
                    }}
                />
            </div>
        );
    }

    return (
        <div
            className="w-full max-w-6xl space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-500"
            dir={isArabic ? 'rtl' : 'ltr'}
        >
            {/* Logo */}
            <div className="flex justify-center items-center mb-8 text-center">
                <Image 
                    src="/logo1.svg" 
                    alt="METRIX Logo" 
                    width={240} 
                    height={96}
                    className="object-contain"
                    priority
                />
            </div>

            {/* Goal Creation Options */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                {/* AI-Powered Goal Creation */}
                <button
                    onClick={() => setCreationMode('ai')}
                    className={`group relative bg-primary/5 hover:bg-primary/10 backdrop-blur-xl p-4 md:p-5 rounded-2xl border border-primary/20 hover:border-primary/40 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden ${isArabic ? 'text-right' : 'text-left'}`}
                >
                    <div className="absolute inset-0 pointer-events-none bg-gradient-to-br from-primary/10/40 to-transparent opacity-40" />
                    <div className="relative flex items-center gap-3 md:gap-4">
                        <div className="shrink-0 w-10 h-10 md:w-12 md:h-12 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20 group-hover:scale-105 transition-transform">
                            <Sparkles className="w-5 h-5 md:w-6 md:h-6 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="text-base md:text-lg font-bold text-foreground mb-1">
                                {language === 'ar' ? 'إنشاء بالذكاء الاصطناعي' : 'AI-Powered Creation'}
                            </h3>
                            <p className="text-xs md:text-sm text-muted-foreground leading-snug">
                                {language === 'ar' 
                                    ? 'اكتب هدفك ودع الذكاء الاصطناعي يخطط لك المهام والجدول الزمني'
                                    : 'Describe your goal and let AI plan your tasks and timeline'}
                            </p>
                        </div>
                    </div>
                </button>

                {/* Manual Goal Creation */}
                <button
                    onClick={() => setCreationMode('manual')}
                    className={`group relative bg-card/40 hover:bg-card/60 backdrop-blur-xl p-4 md:p-5 rounded-2xl border border-border hover:border-primary/30 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden ${isArabic ? 'text-right' : 'text-left'}`}
                >
                    <div className="relative flex items-center gap-3 md:gap-4">
                        <div className="shrink-0 w-10 h-10 md:w-12 md:h-12 rounded-xl bg-muted flex items-center justify-center border border-border group-hover:scale-105 transition-transform">
                            <Plus className="w-5 h-5 md:w-6 md:h-6 text-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="text-base md:text-lg font-bold text-foreground mb-1">
                                {language === 'ar' ? 'إضافة يدوية' : 'Manual Creation'}
                            </h3>
                            <p className="text-xs md:text-sm text-muted-foreground leading-snug">
                                {language === 'ar'
                                    ? 'أضف هدفك يدوياً مع تحديد المهام والمدة والتواريخ'
                                    : 'Add your goal manually with custom tasks, duration, and dates'}
                            </p>
                        </div>
                    </div>
                </button>
            </div>

            {/* Goal Templates */}
            <div className="bg-card/30 backdrop-blur-xl p-5 rounded-[28px] border border-border shadow-lg">
                <GoalTemplates 
                    onSelectTemplate={(template) => {
                        setSelectedTemplate(template);
                        setCreationMode('template');
                    }}
                    language={language}
                />
            </div>

            {/* Recent Goals */}
            {recentGoals.length > 0 && (
                <div className="space-y-4">
                    <div className="flex items-end justify-between px-2">
                        <h2 className="text-2xl font-bold text-foreground">
                            {language === 'ar' ? 'الأهداف الأخيرة' : 'Recent Goals'}
                        </h2>
                        <span className="text-sm text-muted-foreground">
                            {recentGoals.length} {language === 'ar' ? 'أهداف' : 'goals'}
                        </span>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                        {recentGoals.map((goal) => {
                            const titleRTL = isRTL(goal.title);
                            const currentPoints = goal.current_points ?? 0;
                            const targetPoints = goal.target_points ?? 0;
                            const progress = targetPoints > 0
                                ? Math.round((currentPoints / targetPoints) * 100)
                                : 0;
                            const Icon = getIconComponent(goal.icon || 'Target');
                            const cardRTL = isArabic || titleRTL;

                            return (
                                <div
                                    key={goal.id}
                                    className="w-full p-3 rounded-2xl border transition-all relative group bg-card/50 border-border hover:bg-card/70 hover:border-primary/30 hover:shadow-md"
                                >
                                    <button
                                        onClick={() => onSelectGoal(goal.id)}
                                        className={`w-full ${cardRTL ? 'text-right' : 'text-left'}`}
                                        dir={cardRTL ? 'rtl' : 'ltr'}
                                    >
                                        {/* Row 1: Icon, Title, Pin */}
                                        <div className="flex items-center gap-2.5 mb-2">
                                            <div className="shrink-0 w-8 h-8 rounded-xl flex items-center justify-center border transition-colors bg-muted/50 text-muted-foreground border-border group-hover:border-primary/50 group-hover:text-primary">
                                                <Icon className="w-4 h-4" />
                                            </div>

                                            <h3 
                                                className="text-sm font-bold flex-1 truncate text-foreground group-hover:text-primary"
                                                dir={titleRTL ? 'rtl' : 'ltr'}
                                            >
                                                {goal.title}
                                            </h3>

                                            {goal.is_pinned && (
                                                <Pin className="w-3 h-3 text-chart-5 rotate-45 shrink-0" />
                                            )}
                                        </div>

                                        {/* Row 2: Progress Bar with embedded percentage and points */}
                                        <div className="mb-1.5">
                                            <div className="relative h-6 w-full bg-muted/50 rounded-lg overflow-hidden border border-border shadow-inner">
                                                <div
                                                    className="h-full bg-gradient-to-r transition-all duration-1000 ease-out relative from-chart-2 via-chart-2/80 to-chart-2/60"
                                                    style={{ width: `${Math.min(100, progress)}%` }}
                                                >
                                                    <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/waves.png')] animate-pulse"></div>
                                                    <div className="absolute top-0 start-0 w-full h-1/2 bg-white/20"></div>
                                                </div>
                                                
                                                <div className="absolute inset-0 flex items-center justify-center px-2 z-10">
                                                    <span className="text-[10px] font-black text-foreground/80 bg-background/30 backdrop-blur-[2px] px-1.5 py-0.5 rounded border border-white/10">
                                                        {progress}%
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="mt-1 flex items-center justify-between text-[9px] font-bold text-foreground/70 tabular-nums">
                                                <span className="whitespace-nowrap">{currentPoints.toLocaleString()}</span>
                                                <span className="whitespace-nowrap">{targetPoints.toLocaleString()}</span>
                                            </div>
                                        </div>

                                        {/* Row 3: Dates */}
                                        <div className="flex items-center gap-2.5 text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
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
                                                </>
                                            )}
                                        </div>
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
