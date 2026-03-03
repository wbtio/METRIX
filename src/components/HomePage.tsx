'use client';

import { useRef, useState } from 'react';
import { Mic, ArrowUp, StopCircle, Pin, Target } from 'lucide-react';
import { type Language } from '@/lib/translations';
import GoalCreator from './GoalCreator';
import ManualGoalCreator from './ManualGoalCreator';
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
    recentGoalsLimit?: number;
}

interface SpeechRecognitionEventLike {
    resultIndex: number;
    results: ArrayLike<ArrayLike<{ transcript: string }>>;
}

interface SpeechRecognitionLike {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    onresult: ((event: SpeechRecognitionEventLike) => void) | null;
    onerror: (() => void) | null;
    onend: (() => void) | null;
    start: () => void;
    stop: () => void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

interface WindowWithSpeechRecognition extends Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
}

export default function HomePage({
    goals,
    onGoalCreated,
    onSelectGoal,
    language = 'en',
    recentGoalsLimit = 4,
}: HomePageProps) {
    const [goalInput, setGoalInput] = useState('');
    const [showAIGoalDialog, setShowAIGoalDialog] = useState(false);
    const [showManualDialog, setShowManualDialog] = useState(false);
    const [manualInitialData, setManualInitialData] = useState<{ title?: string } | undefined>(undefined);
    const [isRecording, setIsRecording] = useState(false);
    const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

    const isArabic = language === 'ar';
    const safeRecentGoalsLimit = Math.max(1, recentGoalsLimit);
    const recentGoals = goals.slice(0, safeRecentGoalsLimit);

    const isRTL = (text: string) => {
        const rtlChar = /[\u0591-\u07ff\uFB1D-\uFDFD\uFE70-\uFEFC]/;
        const ltrChar = /[A-Za-z\u00C0-\u024F]/;
        for (const char of text.trim()) {
            if (rtlChar.test(char)) return true;
            if (ltrChar.test(char)) return false;
        }
        return isArabic;
    };

    const handleGoalInputSubmit = () => {
        if (goalInput.trim()) {
            setShowAIGoalDialog(true);
        }
    };

    const startRecording = () => {
        if (typeof window === 'undefined') return;
        const speechWindow = window as WindowWithSpeechRecognition;
        const SpeechRecognition = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            alert(language === 'ar' ? 'التعرف على الصوت غير مدعوم. استخدم Chrome أو Edge.' : 'Speech recognition not supported. Use Chrome or Edge.');
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = false;
        recognition.lang = language === 'ar' ? 'ar-SA' : 'en-US';

        recognition.onresult = (event: SpeechRecognitionEventLike) => {
            let transcript = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
                transcript += event.results[i][0].transcript + ' ';
            }
            if (transcript) setGoalInput(prev => prev + transcript);
        };

        recognition.onerror = () => setIsRecording(false);
        recognition.onend = () => setIsRecording(false);

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
        if (isRecording) stopRecording();
        else startRecording();
    };

    return (
        <div
            className="w-full max-w-3xl mx-auto space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-500"
            dir={isArabic ? 'rtl' : 'ltr'}
        >
            <div className="flex justify-center items-center mb-4 sm:mb-8 text-center">
                <Image
                    src="/logo1.svg"
                    alt="METRIX Logo"
                    width={240}
                    height={96}
                    className="w-[170px] sm:w-[220px] md:w-[240px] h-auto object-contain dark:hidden"
                    priority
                />
                <Image
                    src="/logo2.svg"
                    alt="METRIX Logo Dark"
                    width={240}
                    height={96}
                    className="hidden w-[170px] sm:w-[220px] md:w-[240px] h-auto object-contain dark:block"
                    priority
                />
            </div>

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
                >
                    {isRecording && <span className="absolute inset-0 rounded-full bg-red-500/20 animate-pulse" />}
                    {isRecording ? <StopCircle className="w-4 h-4 fill-current relative z-10" /> : <Mic className="w-4 h-4 relative z-10" />}
                </button>

                <input
                    type="text"
                    value={goalInput}
                    onChange={(e) => setGoalInput(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') handleGoalInputSubmit();
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
                >
                    {language === 'ar' ? 'يدويًا' : 'Manual'}
                </button>

                <button
                    onClick={handleGoalInputSubmit}
                    disabled={!goalInput.trim()}
                    className={cn(
                        "h-10 w-10 sm:h-11 sm:w-11 shrink-0 rounded-full border transition-all duration-200 flex items-center justify-center",
                        "shadow-sm",
                        goalInput.trim()
                            ? "border-violet-300/70 bg-violet-500/10 text-violet-700 hover:bg-violet-500/20 hover:border-violet-400 dark:text-violet-300"
                            : "border-border/70 bg-muted/40 text-muted-foreground/50 cursor-not-allowed"
                    )}
                >
                    <ArrowUp className="w-4 h-4" />
                </button>
            </div>

            {recentGoals.length > 0 ? (
                <div className="space-y-4">
                    <div className="flex items-end justify-between px-2">
                        <h2 className="text-xl sm:text-2xl font-bold text-foreground">
                            {language === 'ar' ? 'الأهداف الأخيرة' : 'Recent Goals'}
                        </h2>
                        <span className="text-sm text-muted-foreground">
                            {recentGoals.length} {language === 'ar' ? 'أهداف' : 'goals'}
                        </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                        {recentGoals.map((goal) => {
                            const currentPoints = goal.current_points ?? 0;
                            const targetPoints = goal.target_points ?? 0;
                            const progress = targetPoints > 0 ? Math.round((currentPoints / targetPoints) * 100) : 0;
                            const Icon = getIconComponent(goal.icon || 'Target');
                            const goalIsRTL = isArabic || isRTL(goal.title);

                            return (
                                <div
                                    key={goal.id}
                                    className="w-full p-4 sm:p-5 rounded-3xl border transition-all relative group bg-card/40 border-border hover:bg-card/60 hover:border-primary/30 hover:shadow-md"
                                >
                                    {/* زر التثبيت: مرفوع للأعلى (top-2)، يسار في العربي (left-2)، ويمين في الإنجليزي (right-2) */}
                                    {goal.is_pinned && (
                                        <div className={cn(
                                            "absolute top-2 w-7 h-7 flex items-center justify-center rounded-full bg-chart-5/10 z-10",
                                            goalIsRTL ? "left-2" : "right-2"
                                        )}>
                                            <Pin className="w-3.5 h-3.5 text-chart-5 rotate-45" />
                                        </div>
                                    )}
                                    <button
                                        onClick={() => onSelectGoal(goal.id)}
                                        className="w-full text-start"
                                        dir={goalIsRTL ? 'rtl' : 'ltr'}
                                    >
                                        <div className="w-full flex flex-col gap-3">
                                            <div className="flex items-center gap-3 w-full">
                                                <div className="shrink-0 w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20 group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary transition-colors shadow-sm">
                                                    <Icon className="w-6 h-6" />
                                                </div>
                                                <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                                                    <h3 className="font-bold text-foreground text-base sm:text-lg leading-snug truncate">
                                                        {goal.title}
                                                    </h3>
                                                </div>
                                            </div>

                                            <div className="relative h-10 w-full bg-muted/40 rounded-2xl overflow-hidden border border-border/60 shadow-inner ring-1 ring-white/5 mx-auto">
                                                <div className="absolute inset-x-0 top-0 h-[40%] bg-gradient-to-b from-black/5 to-transparent z-10 pointer-events-none"></div>
                                                <div
                                                    className="h-full bg-gradient-to-r from-primary/80 via-primary to-primary transition-all duration-1000 ease-out relative shadow-[0_0_15px_rgba(var(--primary),0.3)]"
                                                    style={{ width: `${Math.min(100, progress)}%` }}
                                                >
                                                    <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent"></div>
                                                    <div className="absolute inset-0 opacity-30 bg-[url('/patterns/waves.svg')] animate-pulse"></div>
                                                    <div className="absolute right-0 top-0 bottom-0 w-[2px] bg-white/40 shadow-[0_0_10px_rgba(255,255,255,0.5)]"></div>
                                                </div>

                                                <div className="absolute inset-0 flex items-center justify-between px-3 sm:px-5 z-20 font-bold text-xs sm:text-sm tracking-wide" dir="ltr">
                                                    <span className="text-foreground/70 mix-blend-screen drop-shadow-sm tabular-nums flex items-center gap-1">
                                                        {currentPoints.toLocaleString()}
                                                        <span className="text-[9px] sm:text-[10px] opacity-70 font-medium">XP</span>
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
                                        </div>
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ) : (
                <div className="rounded-3xl border border-dashed border-border/80 bg-card/20 p-6 sm:p-10 text-center shadow-sm">
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
                        <Target className="h-7 w-7" />
                    </div>
                    <h2 className="text-lg sm:text-xl font-bold text-foreground">
                        {isArabic ? 'لا توجد أهداف بعد' : 'No goals yet'}
                    </h2>
                    <p className="mt-2 text-sm text-muted-foreground">
                        {isArabic ? 'ابدأ بإضافة هدفك الأول وسيظهر تقدمه هنا.' : 'Create your first goal and its progress will appear here.'}
                    </p>
                </div>
            )}

            <Dialog
                open={showAIGoalDialog}
                onOpenChange={setShowAIGoalDialog}
            >
                <DialogContent className="max-w-2xl sm:max-w-4xl max-h-[92vh] overflow-y-auto p-4 sm:p-6" dir={isArabic ? 'rtl' : 'ltr'}>
                    <DialogTitle className="sr-only">
                        {isArabic ? 'إنشاء هدف بالذكاء الاصطناعي' : 'Create goal with AI'}
                    </DialogTitle>
                    <DialogDescription className="sr-only">
                        {isArabic ? 'اكتب الهدف وراجع الخطة قبل الحفظ' : 'Write your goal and review the generated plan before saving'}
                    </DialogDescription>
                    <GoalCreator
                        onComplete={() => {
                            onGoalCreated();
                            setShowAIGoalDialog(false);
                            setGoalInput('');
                        }}
                        onCancel={() => setShowAIGoalDialog(false)}
                        language={language}
                        initialGoalText={goalInput}
                    />
                </DialogContent>
            </Dialog>

            <Dialog
                open={showManualDialog}
                onOpenChange={(open) => {
                    setShowManualDialog(open);
                    if (!open) setManualInitialData(undefined);
                }}
            >
                <DialogContent className="max-w-2xl sm:max-w-3xl max-h-[90vh] overflow-y-auto p-4 sm:p-6" dir={isArabic ? 'rtl' : 'ltr'}>
                    <DialogTitle className="sr-only">
                        {isArabic ? 'إضافة هدف يدوي' : 'Create goal manually'}
                    </DialogTitle>
                    <DialogDescription className="sr-only">
                        {isArabic ? 'حدد تفاصيل الهدف والمهام' : 'Define goal details and tasks'}
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
        </div>
    );
}
