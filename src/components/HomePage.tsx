'use client';

import { useState, useRef } from 'react';
import { Pin, Mic, ArrowUp, StopCircle } from 'lucide-react';
import { translations, type Language } from '@/lib/translations';
import GoalCreator from './GoalCreator';
import ManualGoalCreator from './ManualGoalCreator';
import GoalTemplates, { type GoalTemplate } from './GoalTemplates';
import Image from 'next/image';
import { getIconComponent } from './IconPicker';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

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
    const [goalInput, setGoalInput] = useState('');
    const [showManualDialog, setShowManualDialog] = useState(false);
    const [manualInitialData, setManualInitialData] = useState<{ title?: string } | undefined>(undefined);
    const [isRecording, setIsRecording] = useState(false);
    const recognitionRef = useRef<any>(null);

    const isArabic = language === 'ar';
    const recentGoals = goals.slice(0, 2);

    const isRTL = (text: string) => {
        const arabicRegex = /[\u0600-\u06ff]/;
        return arabicRegex.test(text);
    };

    const handleGoalInputSubmit = () => {
        if (goalInput.trim()) {
            setCreationMode('ai');
        }
    };

    const startRecording = () => {
        if (typeof window === 'undefined') return;

        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
            alert(language === 'ar' ? 'التعرف على الصوت غير مدعوم. استخدم Chrome أو Edge.' : 'Speech recognition not supported. Use Chrome or Edge.');
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = false;
        recognition.lang = language === 'ar' ? 'ar-SA' : 'en-US';

        recognition.onresult = (event: any) => {
            let transcript = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
                transcript += event.results[i][0].transcript + ' ';
            }
            if (transcript) {
                setGoalInput(prev => prev + transcript);
            }
        };

        recognition.onerror = (e: any) => {
            console.warn('Speech recognition issue:', e.error);
            if (e.error === 'network') {
                alert(language === 'ar'
                    ? 'تعذر الاتصال بخدمة التعرف الصوتي. تأكد من الإنترنت وحاول مرة أخرى.'
                    : 'Unable to reach speech recognition service. Check your internet and try again.');
            }
            setIsRecording(false);
        };

        recognition.onend = () => {
            setIsRecording(false);
        };

        recognitionRef.current = recognition;
        recognition.start();
        setIsRecording(true);
    };

    const stopRecording = () => {
        if (recognitionRef.current) {
            recognitionRef.current.stop();
            recognitionRef.current = null;
        }
        setIsRecording(false);
    };

    const toggleRecording = () => {
        if (isRecording) {
            stopRecording();
        } else {
            startRecording();
        }
    };

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
            className="w-full max-w-6xl space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-500"
            dir={isArabic ? 'rtl' : 'ltr'}
        >
            {/* Logo */}
            <div className="flex justify-center items-center mb-4 sm:mb-8 text-center">
                <Image
                    src="/logo1.svg"
                    alt="METRIX Logo"
                    width={240}
                    height={96}
                    className="w-[170px] sm:w-[220px] md:w-[240px] h-auto object-contain"
                    priority
                />
            </div>

            {/* Quick Goal Creation Input */}
            <div
                className={cn(
                    "relative flex items-center gap-1.5 sm:gap-2 p-1.5 sm:p-2 transition-all duration-200",
                    "bg-background/95 backdrop-blur-sm",
                    "border border-border rounded-2xl sm:rounded-[20px]",
                    "shadow-sm",
                    "focus-within:border-primary/40 focus-within:shadow-md",
                    isRecording && "border-red-500/30 bg-red-50/5"
                )}
                dir={isArabic ? 'rtl' : 'ltr'}
            >
                {/* Voice Button */}
                <button
                    onClick={toggleRecording}
                    aria-pressed={isRecording}
                    aria-label={isRecording
                        ? (language === 'ar' ? 'إيقاف التسجيل الصوتي' : 'Stop voice recording')
                        : (language === 'ar' ? 'بدء التسجيل الصوتي' : 'Start voice recording')}
                    className={cn(
                        "relative h-10 w-10 sm:h-11 sm:w-11 shrink-0 rounded-full border transition-all duration-200 flex items-center justify-center",
                        "shadow-sm",
                        isRecording
                            ? "border-red-400/80 bg-red-500/15 text-red-700 hover:bg-red-500/20 ring-2 ring-red-400/30 dark:text-red-300"
                            : "border-emerald-300/70 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 hover:border-emerald-400 dark:text-emerald-300"
                    )}
                    title={isRecording ? (language === 'ar' ? 'إيقاف التسجيل' : 'Stop Recording') : (language === 'ar' ? 'إدخال صوتي' : 'Voice input')}
                >
                    {isRecording && (
                        <span className="absolute inset-0 rounded-full bg-red-500/20 animate-pulse" />
                    )}
                    {isRecording ? (
                        <StopCircle className="w-4 h-4 fill-current relative z-10" />
                    ) : (
                        <Mic className="w-4 h-4 relative z-10" />
                    )}
                </button>

                {/* Input Field */}
                    <input
                      type="text"
                      value={goalInput}
                      onChange={(e) => setGoalInput(e.target.value)}
                      onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                              handleGoalInputSubmit();
                          }
                      }}
                      placeholder={isRecording ? (language === 'ar' ? 'جارِ الاستماع...' : 'Listening...') : (language === 'ar' ? 'اكتب هدفك هنا...' : 'Write your goal here...')}
                      className={cn(
                          "flex-1 min-w-0 min-h-[40px] sm:min-h-[44px] bg-transparent border-none outline-none",
                          "text-sm sm:text-base font-medium text-foreground placeholder:text-muted-foreground/50",
                          isArabic ? "text-right" : "text-left",
                          isRecording && "placeholder:text-red-500/60",
                          "px-1.5 sm:px-2"
                      )}
                      dir={isArabic ? 'rtl' : 'ltr'}
                  />

                  {/* Manual Creation Button (inside field) */}
                  <button
                      onClick={() => {
                          const trimmedGoal = goalInput.trim();
                          setManualInitialData(trimmedGoal ? { title: trimmedGoal } : undefined);
                          setShowManualDialog(true);
                      }}
                      className={cn(
                            "h-10 sm:h-11 shrink-0 rounded-xl sm:rounded-2xl border px-2.5 sm:px-4 text-xs sm:text-sm font-semibold whitespace-nowrap",
                          "bg-background/95",
                          "border-border text-foreground/90",
                          "transition-all duration-200 shadow-sm",
                          "hover:border-primary/40 hover:shadow-md hover:text-foreground"
                      )}
                      title={language === 'ar' ? 'إضافة الهدف يدوياً' : 'Add goal manually'}
                  >
                      {language === 'ar' ? 'يدويًا' : 'Manual'}
                  </button>

                  {/* AI Send Button */}
                  <button
                    onClick={handleGoalInputSubmit}
                    disabled={!goalInput.trim()}
                    aria-label={language === 'ar' ? 'إرسال الهدف للتحليل الذكي' : 'Send goal for AI planning'}
                    className={cn(
                        "h-10 w-10 sm:h-11 sm:w-11 shrink-0 rounded-full border transition-all duration-200 flex items-center justify-center",
                        "shadow-sm",
                        goalInput.trim()
                            ? "border-violet-300/70 bg-violet-500/10 text-violet-700 hover:bg-violet-500/20 hover:border-violet-400 dark:text-violet-300"
                            : "border-border/70 bg-muted/40 text-muted-foreground/50 cursor-not-allowed"
                    )}
                    title={language === 'ar' ? 'إرسال للذكاء' : 'Send to AI'}
                >
                    <ArrowUp className="w-4 h-4" />
                </button>
            </div>

            {/* AI Goal Creator - Shown inline when user types */}
            {creationMode === 'ai' && (
                <div className="animate-in fade-in slide-in-from-top-4 duration-300">
                    <GoalCreator
                        onComplete={() => {
                            onGoalCreated();
                            setCreationMode('none');
                            setGoalInput('');
                        }}
                        onCancel={() => {
                            setCreationMode('none');
                            setGoalInput('');
                        }}
                        language={language}
                    />
                </div>
            )}

            {/* Manual Goal Creator Dialog */}
            <Dialog
                open={showManualDialog}
                onOpenChange={(open) => {
                    setShowManualDialog(open);
                    if (!open) {
                        setManualInitialData(undefined);
                    }
                }}
            >
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" dir={isArabic ? 'rtl' : 'ltr'}>
                    <DialogTitle className="sr-only">
                        {isArabic ? 'إضافة هدف يدوياً' : 'Create goal manually'}
                    </DialogTitle>
                    <DialogDescription className="sr-only">
                        {isArabic ? 'حدد تفاصيل الهدف والمهام المطلوبة' : 'Set goal details and required tasks'}
                    </DialogDescription>
                    <ManualGoalCreator
                        onComplete={() => {
                            onGoalCreated();
                            setShowManualDialog(false);
                        }}
                        onCancel={() => setShowManualDialog(false)}
                        language={language}
                        initialData={manualInitialData}
                    />
                </DialogContent>
            </Dialog>

            {/* Goal Templates */}
            <div className="bg-card/30 backdrop-blur-xl p-3 sm:p-4 rounded-[18px] sm:rounded-[24px] border border-border shadow-lg">
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
                        <h2 className="text-xl sm:text-2xl font-bold text-foreground">
                            {language === 'ar' ? 'الأهداف الأخيرة' : 'Recent Goals'}
                        </h2>
                        <span className="text-sm text-muted-foreground">
                            {recentGoals.length} {language === 'ar' ? 'أهداف' : 'goals'}
                        </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
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
                                    className="w-full p-4 sm:p-5 rounded-3xl border transition-all relative group bg-card/50 border-border hover:bg-card/70 hover:border-primary/30 hover:shadow-lg"
                                >
                                    <button
                                        onClick={() => onSelectGoal(goal.id)}
                                        className={`w-full flex flex-col gap-3`}
                                    >
                                        {/* Header: Icon + Title + Pin */}
                                        <div className="flex items-center gap-3 w-full" dir={cardRTL ? 'rtl' : 'ltr'}>
                                            <div className="shrink-0 w-10 h-10 sm:w-11 sm:h-11 rounded-2xl flex items-center justify-center border transition-colors bg-muted/50 text-muted-foreground border-border group-hover:border-primary/50 group-hover:text-primary shadow-sm">
                                                <Icon className="w-5 h-5" />
                                            </div>

                                            <h3
                                                className={`text-base sm:text-lg font-bold flex-1 text-foreground group-hover:text-primary overflow-hidden whitespace-nowrap text-ellipsis ${titleRTL ? 'text-right direction-rtl' : 'text-left direction-ltr'}`}
                                            >
                                                {goal.title}
                                            </h3>

                                            {goal.is_pinned && (
                                                <div className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-chart-5/10">
                                                    <Pin className="w-4 h-4 text-chart-5 rotate-45" />
                                                </div>
                                            )}
                                        </div>

                                        {/* Progress Bar Tube */}
                                        <div className="relative h-10 sm:h-11 w-full bg-muted/40 rounded-2xl overflow-hidden border border-border/60 shadow-inner ring-1 ring-white/5 mx-auto">
                                            {/* Tube Background Effect */}
                                            <div className="absolute inset-x-0 top-0 h-[40%] bg-gradient-to-b from-black/5 to-transparent z-10 pointer-events-none"></div>

                                            {/* Filling */}
                                            <div
                                                className="h-full bg-gradient-to-r from-primary/80 via-primary to-primary transition-all duration-1000 ease-out relative shadow-[0_0_15px_rgba(var(--primary),0.3)]"
                                                style={{ width: `${Math.min(100, progress)}%` }}
                                            >
                                                {/* Fluid/Glass Effect on Fill */}
                                                <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent"></div>
                                                <div className="absolute inset-0 opacity-30 bg-[url('https://www.transparenttextures.com/patterns/waves.png')] animate-pulse"></div>

                                                {/* Light Shine on right edge */}
                                                <div className="absolute right-0 top-0 bottom-0 w-[2px] bg-white/40 shadow-[0_0_10px_rgba(255,255,255,0.5)]"></div>
                                            </div>

                                            {/* Content Inside Tube - with XP labels for clarity */}
                                            <div className="absolute inset-0 flex items-center justify-between px-3 sm:px-5 z-20 font-bold text-xs sm:text-sm tracking-wide">
                                                <span className="text-foreground/70 mix-blend-screen drop-shadow-sm tabular-nums flex items-center gap-1">
                                                    {currentPoints.toLocaleString()}
                                                    <span className="text-[9px] sm:text-[10px] opacity-70 font-medium"></span>
                                                </span>
                                                <span className="text-foreground/90 mix-blend-screen drop-shadow-sm font-black text-sm sm:text-base">
                                                    {progress}%
                                                </span>
                                                <span className="text-muted-foreground/80 mix-blend-screen drop-shadow-sm tabular-nums flex items-center gap-0.5">
                                                    <span className="text-[9px] sm:text-[10px] opacity-60">/</span>
                                                    {targetPoints.toLocaleString()}
                                                </span>
                                            </div>
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
