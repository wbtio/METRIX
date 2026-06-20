'use client';

import { MatrixManifestoDialog } from '@/components/login/MatrixManifestoDialog';
import { useState, useEffect, useRef, useCallback } from 'react';
import {
    Sun, Moon, Globe, Target, Flame, Crown, LogOut, User, Camera, Trash2, ScrollText, Download, Loader2
} from 'lucide-react';
import { translations, type Language } from '@/lib/translations';
import { createClient } from '@/utils/supabase/client';
import { cn } from '@/lib/utils';
import { getIconComponent } from '@/components/goal/IconPicker';
import { buildTaskHierarchy, type TaskRow } from '@/lib/task-hierarchy';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
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
import { ScrollArea } from '@/components/ui/scroll-area';
import type { User as SupabaseUser } from '@supabase/supabase-js';

interface Goal {
    id: string;
    title: string;
    current_points: number;
    target_points: number;
    status: string;
    created_at: string;
    domain?: string | null;
    icon?: string;
    estimated_completion_date?: string | null;
    total_days?: number | null;
    ai_summary?: string | null;
}

interface SettingsPageProps {
    user: SupabaseUser | null;
    language: Language;
    setLanguage: (lang: Language) => void;
    goals: Goal[];
    onProfileUpdated?: () => void | Promise<void>;
    onGoalsDeleted?: () => void;
}

type SettingsTab = 'general' | 'profile';

export default function SettingsPage({ user, language, setLanguage, goals, onProfileUpdated }: SettingsPageProps) {
    const t = translations[language];
    const isArabic = language === 'ar';
    const supabase = createClient();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [activeTab, setActiveTab] = useState<SettingsTab>('general');
    const [theme, setTheme] = useState<'light' | 'dark'>('light');
    const [totalLogs, setTotalLogs] = useState(0);
    const [maxStreak, setMaxStreak] = useState(0);
    const [signingOut, setSigningOut] = useState(false);
    const [isManifestoOpen, setIsManifestoOpen] = useState(false);

    // Profile state
    const [displayName, setDisplayName] = useState('');
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const [updatingProfile, setUpdatingProfile] = useState(false);
    const [profileMessage, setProfileMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
        if (savedTheme) setTheme(savedTheme);
        fetchStats();
    }, []);

    useEffect(() => {
        if (user) {
            setDisplayName(user.user_metadata?.full_name || user.email?.split('@')[0] || '');
            setAvatarUrl(user.user_metadata?.avatar_url || null);
        }
    }, [user]);

    const fetchStats = async () => {
        try {
            const { count: logsCount } = await supabase
                .from('daily_logs')
                .select('id', { count: 'exact' });
            setTotalLogs(logsCount ?? 0);

            const { data: allLogs } = await supabase
                .from('daily_logs')
                .select('created_at, goal_id')
                .order('created_at', { ascending: true });

            if (allLogs && allLogs.length > 0) {
                const logsByGoal = allLogs.reduce((acc: Record<string, string[]>, log) => {
                    if (!acc[log.goal_id]) acc[log.goal_id] = [];
                    acc[log.goal_id].push(log.created_at);
                    return acc;
                }, {});

                let absoluteMaxStreak = 0;
                Object.values(logsByGoal).forEach(dates => {
                    const toLocalDateStr = (isoStr: string) => {
                        const d = new Date(isoStr);
                        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                    };
                    const uniqueDates = Array.from(new Set(dates.map(toLocalDateStr))).sort();
                    if (uniqueDates.length === 0) return;
                    let currentStreak = 1;
                    let localMaxStreak = 1;
                    for (let i = 1; i < uniqueDates.length; i++) {
                        const prevDate = new Date(uniqueDates[i - 1]);
                        prevDate.setDate(prevDate.getDate() + 1);
                        if (toLocalDateStr(prevDate.toISOString()) === uniqueDates[i]) {
                            currentStreak++;
                            localMaxStreak = Math.max(localMaxStreak, currentStreak);
                        } else {
                            currentStreak = 1;
                        }
                    }
                    absoluteMaxStreak = Math.max(absoluteMaxStreak, localMaxStreak);
                });
                setMaxStreak(absoluteMaxStreak);
            }
        } catch (error) {
            console.error('Error fetching stats:', error);
        }
    };


    const handleThemeChange = (newTheme: 'light' | 'dark') => {
        setTheme(newTheme);
        localStorage.setItem('theme', newTheme);
        if (newTheme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    };

    const handleLanguageChange = (lang: Language) => {
        setLanguage(lang);
        localStorage.setItem('language', lang);
        document.documentElement.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
        document.documentElement.setAttribute('lang', lang);
    };

    const handleSignOut = async () => {
        setSigningOut(true);
        await supabase.auth.signOut();
        window.location.href = '/login';
    };


    const handleDisplayNameSave = async () => {
        if (!user) return;
        setUpdatingProfile(true);
        setProfileMessage(null);
        const { error } = await supabase.auth.updateUser({ data: { full_name: displayName.trim() || null } });
        setUpdatingProfile(false);
        if (error) {
            setProfileMessage({ type: 'error', text: error.message });
        } else {
            setProfileMessage({ type: 'success', text: isArabic ? 'تم حفظ الاسم' : 'Name saved' });
            setTimeout(() => setProfileMessage(null), 2500);
            await onProfileUpdated?.();
        }
    };

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user) return;
        if (!file.type.startsWith('image/')) {
            setProfileMessage({ type: 'error', text: isArabic ? 'يرجى اختيار صورة' : 'Please select an image' });
            return;
        }
        setUpdatingProfile(true);
        setProfileMessage(null);
        try {
            let urlToUse: string;
            const ext = file.name.split('.').pop() || 'jpg';
            const path = `${user.id}/avatar.${ext}`;
            const { error: uploadError } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
            if (uploadError) {
                urlToUse = await new Promise<string>((resolve) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result as string);
                    reader.readAsDataURL(file);
                });
            } else {
                const { data } = supabase.storage.from('avatars').getPublicUrl(path);
                urlToUse = data.publicUrl;
            }
            const { error: updateError } = await supabase.auth.updateUser({ data: { avatar_url: urlToUse } });
            if (updateError) {
                setProfileMessage({ type: 'error', text: updateError.message });
            } else {
                setAvatarUrl(urlToUse);
                setProfileMessage({ type: 'success', text: isArabic ? 'تم رفع الصورة' : 'Photo updated' });
                setTimeout(() => setProfileMessage(null), 2500);
                await onProfileUpdated?.();
            }
        } catch (err) {
            setProfileMessage({ type: 'error', text: (err as Error).message });
        } finally {
            setUpdatingProfile(false);
        }
        e.target.value = '';
    };

    const handleRemovePhoto = async () => {
        if (!user) return;
        setUpdatingProfile(true);
        setProfileMessage(null);
        const { error } = await supabase.auth.updateUser({ data: { avatar_url: null } });
        setUpdatingProfile(false);
        if (error) {
            setProfileMessage({ type: 'error', text: error.message });
        } else {
            setAvatarUrl(null);
            setProfileMessage({ type: 'success', text: isArabic ? 'تم حذف الصورة' : 'Photo removed' });
            setTimeout(() => setProfileMessage(null), 2500);
            await onProfileUpdated?.();
        }
    };

    const completedGoals = goals.filter(g => g.current_points >= g.target_points).length;
    const totalPointsEarned = goals.reduce((sum, g) => sum + (g.current_points || 0), 0);

    // Export state
    const [exportingGoalId, setExportingGoalId] = useState<string | null>(null);

    const handleExportGoal = async (goal: Goal) => {
        if (exportingGoalId) return;
        setExportingGoalId(goal.id);
        try {
            // Fetch tasks and log dates in parallel (minimal columns)
            const [{ data: taskRows }, { data: logRows }] = await Promise.all([
                supabase
                    .from('sub_layers')
                    .select('id, goal_id, task_description, impact_weight, frequency, task_type, parent_task_id, sort_order, icon')
                    .eq('goal_id', goal.id)
                    .order('sort_order', { ascending: true }),
                supabase
                    .from('daily_logs')
                    .select('created_at, ai_score')
                    .eq('goal_id', goal.id)
                    .order('created_at', { ascending: true }),
            ]);

            const tasks = (taskRows || []) as TaskRow[];
            const logs = (logRows || []) as { created_at: string; ai_score: number }[];
            const hierarchy = buildTaskHierarchy(tasks);

            const progress = goal.target_points > 0
                ? Math.round((goal.current_points / goal.target_points) * 100)
                : 0;

            const formatDate = (dateStr: string | null | undefined) => {
                if (!dateStr) return '—';
                const d = new Date(dateStr);
                return d.toLocaleDateString('en-CA'); // YYYY-MM-DD
            };

            // --- Build Markdown ---
            const lines: string[] = [];
            lines.push(`# 🎯 ${goal.title}`);
            lines.push('');

            // Summary table
            lines.push(`## ${isArabic ? 'ملخص الهدف' : 'Goal Summary'}`);
            lines.push('');
            lines.push(`| ${isArabic ? 'العنصر' : 'Field'} | ${isArabic ? 'القيمة' : 'Value'} |`);
            lines.push('|---|---|');
            lines.push(`| ${t.progressLabel} | **${goal.current_points}** / ${goal.target_points} (${progress}%) |`);
            lines.push(`| ${t.statusLabel} | ${goal.status || '—'} |`);
            if (goal.domain) lines.push(`| ${t.goalDomain} | ${goal.domain} |`);
            lines.push(`| ${t.createdAtLabel} | ${formatDate(goal.created_at)} |`);
            if (goal.estimated_completion_date) lines.push(`| ${t.estimatedEnd} | ${formatDate(goal.estimated_completion_date)} |`);
            if (goal.total_days) lines.push(`| ${t.totalDays} | ${goal.total_days} |`);
            lines.push(`| ${t.daysActive} | ${logs.length} |`);
            lines.push(`| ${t.totalPointsEarned} | ${goal.current_points} |`);
            lines.push('');

            // Progress bar visualization
            const barLength = 20;
            const filledLength = Math.round((progress / 100) * barLength);
            const bar = '█'.repeat(filledLength) + '░'.repeat(barLength - filledLength);
            lines.push(`> ${t.progressLabel}: \`${bar}\` ${progress}%`);
            lines.push('');

            // AI Summary
            if (goal.ai_summary) {
                lines.push(`## ${t.aiSummary}`);
                lines.push('');
                lines.push(goal.ai_summary);
                lines.push('');
            }

            // Tasks hierarchy
            lines.push(`## ${t.tasksOverview}`);
            lines.push('');
            if (hierarchy.length === 0) {
                lines.push(`*${t.noTasks}*`);
            } else {
                for (const main of hierarchy) {
                    const freq = main.frequency === 'weekly' ? (isArabic ? 'أسبوعي' : 'Weekly') : (isArabic ? 'يومي' : 'Daily');
                    lines.push(`### 📋 ${main.task_description}`);
                    lines.push(`> ${t.weightLabel}: ${main.impact_weight} · ${t.frequencyLabel}: ${freq}`);
                    lines.push('');
                    if (main.subtasks.length > 0) {
                        for (const sub of main.subtasks) {
                            const subFreq = sub.frequency === 'weekly' ? (isArabic ? 'أسبوعي' : 'Weekly') : (isArabic ? 'يومي' : 'Daily');
                            lines.push(`- **${sub.task_description}** — ${t.weightLabel}: ${sub.impact_weight}, ${t.frequencyLabel}: ${subFreq}`);
                        }
                        lines.push('');
                    }
                }
            }
            lines.push('');

            // Activity Calendar
            lines.push(`## ${t.activityCalendar}`);
            lines.push('');

            if (logs.length === 0) {
                lines.push(`*${t.noLogs}*`);
            } else {
                // Build set of logged dates
                const loggedDates = new Set<string>();
                for (const log of logs) {
                    const d = new Date(log.created_at);
                    loggedDates.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
                }

                // Month-by-month calendar from goal creation to today
                const startDate = new Date(goal.created_at);
                startDate.setHours(0, 0, 0, 0);
                const today = new Date();
                today.setHours(0, 0, 0, 0);

                const currentMonth = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
                const endMonth = new Date(today.getFullYear(), today.getMonth(), 1);

                while (currentMonth <= endMonth) {
                    const year = currentMonth.getFullYear();
                    const month = currentMonth.getMonth();
                    const monthName = currentMonth.toLocaleDateString(isArabic ? 'ar' : 'en', { month: 'long', year: 'numeric' });
                    const daysInMonth = new Date(year, month + 1, 0).getDate();

                    lines.push(`### 📅 ${monthName}`);
                    lines.push('');

                    // Week header
                    const dayNames = isArabic
                        ? ['سبت', 'أحد', 'إثن', 'ثلا', 'أربع', 'خمي', 'جمع']
                        : ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
                    lines.push(`| ${dayNames.join(' | ')} |`);
                    lines.push(`| ${dayNames.map(() => '---').join(' | ')} |`);

                    // Find the day of week for day 1 (Saturday = 0)
                    const firstDayOfMonth = new Date(year, month, 1);
                    const dayOfWeek = (firstDayOfMonth.getDay() + 1) % 7; // Shift so Saturday=0

                    let row: string[] = Array(dayOfWeek).fill('');
                    for (let day = 1; day <= daysInMonth; day++) {
                        const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                        const dateObj = new Date(year, month, day);

                        let cell = '';
                        if (dateObj > today) {
                            cell = `${day}`;
                        } else if (dateObj < startDate) {
                            cell = `${day}`;
                        } else if (loggedDates.has(dateKey)) {
                            cell = `✅ ${day}`;
                        } else {
                            cell = `❌ ${day}`;
                        }
                        row.push(cell);

                        if (row.length === 7) {
                            lines.push(`| ${row.join(' | ')} |`);
                            row = [];
                        }
                    }
                    // Fill remaining cells
                    if (row.length > 0) {
                        while (row.length < 7) row.push('');
                        lines.push(`| ${row.join(' | ')} |`);
                    }
                    lines.push('');

                    // Move to next month
                    currentMonth.setMonth(currentMonth.getMonth() + 1);
                }

                // Legend
                lines.push(`> ✅ = ${t.logged} · ❌ = ${t.missed}`);
                lines.push('');
            }

            // Footer
            lines.push('---');
            lines.push(`*${isArabic ? 'تم التصدير بواسطة METRIX' : 'Exported by METRIX'} — ${new Date().toLocaleDateString(isArabic ? 'ar' : 'en', { year: 'numeric', month: 'long', day: 'numeric' })}*`);

            const markdown = lines.join('\n');

            // Download
            const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const safeName = goal.title.replace(/[^a-zA-Z0-9\u0600-\u06FF\s]/g, '').replace(/\s+/g, '_').slice(0, 50);
            a.download = `${safeName}_Export.md`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            setProfileMessage({ type: 'success', text: t.goalExportedSuccess });
            setTimeout(() => setProfileMessage(null), 2500);
        } catch (err) {
            console.error('Export error:', err);
            setProfileMessage({ type: 'error', text: (err as Error).message });
        } finally {
            setExportingGoalId(null);
        }
    };

    return (
        <div
            className="w-full max-w-4xl 2xl:max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-6 duration-500 flex-1 flex flex-col gap-4"
            dir={isArabic ? 'rtl' : 'ltr'}
        >
            <MatrixManifestoDialog
                open={isManifestoOpen}
                onOpenChange={setIsManifestoOpen}
            />

            <div className="bg-card/40 backdrop-blur-xl p-3 sm:p-4 rounded-2xl sm:rounded-[22px] border border-border/60 shadow-sm shadow-black/[0.02] flex-1 flex flex-col min-h-0">
                {/* Tabs */}
                <div className="relative flex gap-1 mb-3 p-1 rounded-xl bg-muted/50 border border-border/40 h-11">
                    {/* Sliding active background indicator */}
                    <div 
                        className="absolute top-1 bottom-1 rounded-lg bg-background shadow-sm ring-1 ring-border/50"
                        style={{
                            width: 'calc((100% - 12px) / 2)',
                            left: isArabic 
                              ? 'auto' 
                              : `calc(4px + ${activeTab === 'profile' ? 1 : 0} * ((100% - 12px) / 2 + 4px))`,
                            right: isArabic 
                              ? `calc(4px + ${activeTab === 'profile' ? 1 : 0} * ((100% - 12px) / 2 + 4px))` 
                              : 'auto',
                            transition: 'all 300ms cubic-bezier(0.25, 1, 0.5, 1)'
                        }}
                    />
                    <button
                        onClick={() => setActiveTab('general')}
                        className={cn(
                            "relative z-10 flex flex-1 items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition-all duration-200 active:scale-95",
                            activeTab === 'general'
                                ? "text-foreground font-bold"
                                : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <Globe className="w-4 h-4 opacity-80" />
                        {t.generalSettings}
                    </button>
                    <button
                        onClick={() => setActiveTab('profile')}
                        className={cn(
                            "relative z-10 flex flex-1 items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition-all duration-200 active:scale-95",
                            activeTab === 'profile'
                                ? "text-foreground font-bold"
                                : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <User className="w-4 h-4 opacity-80" />
                        {t.profileSettings}
                    </button>
                </div>

                <ScrollArea className="flex-1 min-h-0 pr-1" dir={isArabic ? 'rtl' : 'ltr'}>
                    {activeTab === 'general' ? (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 ease-out-quart">
                    <div className="bg-card/40 rounded-2xl border border-border/60 overflow-hidden divide-y divide-border/40 shadow-sm shadow-black/[0.02]">
                        {/* Appearance */}
                        <div className="p-3 sm:p-4 flex flex-row items-center justify-between gap-3 hover:bg-muted/5 transition-colors">
                            <div className="flex items-center gap-2.5 flex-1 min-w-0">
                                <div className="shrink-0 w-8 h-8 rounded-[10px] bg-primary/[0.08] border border-primary/10 flex items-center justify-center">
                                    {theme === 'dark' ? <Moon className="w-3.5 h-3.5 text-primary" /> : <Sun className="w-3.5 h-3.5 text-primary" />}
                                </div>
                                <p className="font-bold text-foreground text-sm">{t.appearance}</p>
                            </div>
                            <div className="flex gap-1 shrink-0 bg-muted/40 p-0.5 rounded-lg">
                                <button
                                    onClick={() => handleThemeChange('light')}
                                    className={cn(
                                        "flex items-center justify-center w-8 h-8 sm:w-auto sm:h-auto sm:px-2.5 sm:py-1 rounded-md text-xs font-semibold transition-all duration-200",
                                        theme === 'light' ? "bg-background text-primary shadow-sm ring-1 ring-border/50" : "text-muted-foreground hover:text-foreground"
                                    )}
                                    title={t.lightMode}
                                >
                                    <Sun className="w-3.5 h-3.5 sm:me-1" />
                                    <span className="hidden sm:inline">{t.lightMode}</span>
                                </button>
                                <button
                                    onClick={() => handleThemeChange('dark')}
                                    className={cn(
                                        "flex items-center justify-center w-8 h-8 sm:w-auto sm:h-auto sm:px-2.5 sm:py-1 rounded-md text-xs font-semibold transition-all duration-200",
                                        theme === 'dark' ? "bg-background text-primary shadow-sm ring-1 ring-border/50" : "text-muted-foreground hover:text-foreground"
                                    )}
                                    title={t.darkMode}
                                >
                                    <Moon className="w-3.5 h-3.5 sm:me-1" />
                                    <span className="hidden sm:inline">{t.darkMode}</span>
                                </button>
                            </div>
                        </div>

                        {/* Language */}
                        <div className="p-3 sm:p-4 flex flex-row items-center justify-between gap-3 hover:bg-muted/5 transition-colors">
                            <div className="flex items-center gap-2.5 flex-1 min-w-0">
                                <div className="shrink-0 w-8 h-8 rounded-[10px] bg-primary/[0.08] border border-primary/10 flex items-center justify-center">
                                    <Globe className="w-3.5 h-3.5 text-primary" />
                                </div>
                                <p className="font-bold text-foreground text-sm">{t.language}</p>
                            </div>
                            <div className="flex gap-1 shrink-0 bg-muted/40 p-0.5 rounded-lg">
                                <button
                                    onClick={() => handleLanguageChange('en')}
                                    className={cn(
                                        "flex items-center justify-center w-8 h-8 sm:w-auto sm:h-auto sm:px-2.5 sm:py-1 rounded-md text-xs font-semibold transition-all duration-200",
                                        language === 'en' ? "bg-background text-foreground shadow-sm ring-1 ring-border/50" : "text-muted-foreground hover:text-foreground"
                                    )}
                                    title={t.english}
                                >
                                    <span className="sm:hidden font-bold">EN</span>
                                    <span className="hidden sm:inline">{t.english}</span>
                                </button>
                                <button
                                    onClick={() => handleLanguageChange('ar')}
                                    className={cn(
                                        "flex items-center justify-center w-8 h-8 sm:w-auto sm:h-auto sm:px-2.5 sm:py-1 rounded-md text-xs font-semibold transition-all duration-200",
                                        language === 'ar' ? "bg-background text-foreground shadow-sm ring-1 ring-border/50" : "text-muted-foreground hover:text-foreground"
                                    )}
                                    title={t.arabic}
                                >
                                    <span className="sm:hidden font-bold">AR</span>
                                    <span className="hidden sm:inline">{t.arabic}</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Matrix Story */}
                    <div className="mt-3 rounded-2xl border border-border/60 bg-card/30 p-3 sm:p-4 shadow-sm shadow-black/[0.02]">
                        <div className="flex items-center gap-2.5">
                            <div className="shrink-0 w-8 h-8 rounded-[10px] bg-primary/[0.08] border border-primary/10 flex items-center justify-center">
                                <ScrollText className="w-3.5 h-3.5 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-bold text-foreground text-sm">{t.matrixStory}</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsManifestoOpen(true)}
                                className="shrink-0 rounded-lg bg-primary/[0.08] border border-primary/10 px-3 py-1.5 text-xs font-semibold text-primary transition-all hover:bg-primary/15 active:scale-[0.97]"
                            >
                                {t.readStory}
                            </button>
                        </div>
                    </div>
                    </div>
                ) : (
                    <div className="space-y-4 px-0.5 py-0.5 sm:px-1 animate-in fade-in slide-in-from-bottom-4 duration-300 ease-out-quart">
                        {/* Profile section */}
                        <section className="space-y-3">
                            {profileMessage && (
                                <div className={cn(
                                    "text-xs font-medium px-3 py-2 rounded-lg animate-in fade-in slide-in-from-top-1 duration-200",
                                    profileMessage.type === 'success' ? "bg-emerald-500/[0.06] text-emerald-600 border border-emerald-500/10" : "bg-destructive/[0.06] text-destructive border border-destructive/10"
                                )}>
                                    {profileMessage.text}
                                </div>
                            )}

                            {/* Profile Picture + Name Row */}
                            <div className="flex items-center gap-3 rounded-xl bg-card/40 border border-border/40 px-3 py-3 sm:px-4 sm:py-4 transition-all hover:border-border/60 shadow-sm shadow-black/[0.02]">
                                <div className="relative group shrink-0">
                                    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full overflow-hidden bg-muted/40 border border-border/60 flex items-center justify-center transition-transform duration-200 group-hover:scale-[1.02]">
                                        {avatarUrl ? (
                                            <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="text-lg sm:text-xl font-bold text-muted-foreground">
                                                {displayName?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
                                            </span>
                                        )}
                                    </div>
                                    <div className="absolute inset-0 rounded-full bg-black/40 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center justify-center gap-1">
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={handlePhotoUpload}
                                        />
                                        <button
                                            onClick={() => fileInputRef.current?.click()}
                                            disabled={updatingProfile}
                                            className="p-1 rounded-full bg-white/90 hover:bg-white text-foreground shadow-sm transition-all hover:scale-110"
                                            title={t.changePhoto}
                                        >
                                            <Camera className="w-3 h-3" />
                                        </button>
                                        {avatarUrl && (
                                            <button
                                                onClick={handleRemovePhoto}
                                                disabled={updatingProfile}
                                                className="p-1 rounded-full bg-destructive/90 hover:bg-destructive text-white shadow-sm transition-all hover:scale-110"
                                                title={t.removePhoto}
                                            >
                                                <Trash2 className="w-3 h-3" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="text"
                                            value={displayName}
                                            onChange={(e) => setDisplayName(e.target.value)}
                                            placeholder={user?.email?.split('@')[0] || ''}
                                            className="flex-1 min-w-0 px-2.5 py-1.5 rounded-lg border border-border/60 bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-shadow"
                                        />
                                        <button
                                            onClick={handleDisplayNameSave}
                                            disabled={updatingProfile}
                                            className="shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold transition-all disabled:opacity-50 active:scale-[0.97] hover:opacity-90"
                                        >
                                            {updatingProfile && (
                                                <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                            )}
                                            {t.saveChanges}
                                        </button>
                                    </div>
                                    <p className="text-[11px] text-muted-foreground/70 mt-1 truncate">{user?.email || '—'}</p>
                                </div>
                            </div>

                            {/* Account Stats — Ultra Compact */}
                            <div className="pt-1">
                                <div className="mb-2 flex items-center justify-between">
                                    <p className="flex items-center gap-1.5 text-sm font-bold text-foreground">
                                        <Target className="w-3.5 h-3.5 text-primary" />
                                        {t.account}
                                    </p>
                                    <div className="flex gap-1">
                                        {maxStreak >= 30 && (
                                            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-yellow-300 to-amber-500 flex items-center justify-center shadow-sm ring-1 ring-background" title={isArabic ? "تاج الالتزام: 30 يوماً" : "Crown of Commitment: 30 Days"}>
                                                <Crown className="w-2.5 h-2.5 text-white" />
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                                    {[
                                        { label: t.goalsCreated, value: goals.length },
                                        { label: t.completedGoals, value: completedGoals },
                                        { label: t.totalPointsEarned, value: totalPointsEarned >= 1000 ? (totalPointsEarned / 1000).toFixed(1) + 'k' : totalPointsEarned },
                                        { label: t.totalLogsRecorded, value: totalLogs },
                                    ].map((stat, i) => (
                                        <div
                                            key={i}
                                            className="rounded-xl bg-card/40 border border-border/40 px-2 py-2.5 text-center transition-all duration-200 hover:bg-card/60 hover:border-border/60 hover:-translate-y-px hover:shadow-sm"
                                        >
                                            <p className="text-base font-bold leading-tight text-foreground tabular-nums">{stat.value}</p>
                                            <p className={cn("text-[10px] leading-tight font-medium text-muted-foreground mt-0.5", !isArabic && "uppercase")}>{stat.label}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </section>

                        <div className="h-px bg-gradient-to-r from-transparent via-border/40 to-transparent" />

                        {/* My Goals — Compact Export Section */}
                        <section>
                            <p className="mb-2 flex items-center gap-1.5 text-sm font-bold text-foreground">
                                <Target className="w-3.5 h-3.5 text-primary" />
                                {t.myGoalsSection}
                            </p>
                            {goals.length === 0 ? (
                                <div className="flex flex-col items-center justify-center gap-2 py-6 text-muted-foreground/60">
                                    <Target className="w-5 h-5 opacity-50" />
                                    <p className="text-xs font-medium">{t.noGoalsProfileHint}</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {goals.map((goal) => {
                                        const GoalIcon = getIconComponent(goal.icon || 'Target');
                                        const isExporting = exportingGoalId === goal.id;

                                        return (
                                            <div
                                                key={goal.id}
                                                className="flex items-center gap-2.5 rounded-xl bg-card/40 border border-border/40 px-3 py-2.5 transition-all duration-200 hover:bg-card/60 hover:border-border/60 hover:shadow-sm hover:-translate-y-px"
                                            >
                                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-primary/[0.08] border border-primary/10">
                                                    <GoalIcon className="w-3.5 h-3.5 text-primary" />
                                                </div>
                                                <p className="flex-1 min-w-0 text-sm font-semibold text-foreground truncate">{goal.title}</p>
                                                <button
                                                    onClick={() => handleExportGoal(goal)}
                                                    disabled={!!exportingGoalId}
                                                    className={cn(
                                                        "shrink-0 flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold transition-all duration-200",
                                                        isExporting
                                                            ? "bg-primary/[0.06] text-primary cursor-wait"
                                                            : "bg-muted/30 text-muted-foreground hover:bg-primary/[0.08] hover:text-primary border border-border/40 hover:border-primary/15 active:scale-[0.96]"
                                                    )}
                                                    title={t.exportGoal}
                                                >
                                                    {isExporting ? (
                                                        <Loader2 className="w-3 h-3 animate-spin" />
                                                    ) : (
                                                        <Download className="w-3 h-3" />
                                                    )}
                                                    <span className="hidden sm:inline">{isExporting ? t.exportingGoal : t.exportGoal}</span>
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </section>

                        <div className="h-px bg-gradient-to-r from-transparent via-border/40 to-transparent" />

                        {/* Sign Out */}
                        <button
                            onClick={handleSignOut}
                            disabled={signingOut}
                            className={cn(
                                "w-full flex items-center justify-center gap-2 p-2.5 rounded-xl border transition-all duration-200 font-semibold text-xs shrink-0",
                                signingOut
                                    ? "bg-muted/20 border-border/30 text-muted-foreground cursor-not-allowed"
                                    : "border-destructive/20 text-destructive/80 hover:bg-destructive hover:text-destructive-foreground hover:border-destructive active:scale-[0.98] shadow-sm hover:shadow-md"
                            )}
                        >
                            {signingOut ? (
                                <>
                                    <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0" />
                                    {t.signingOut}
                                </>
                            ) : (
                                <>
                                    <LogOut className="w-3.5 h-3.5 shrink-0" />
                                    {t.signOut}
                                </>
                            )}
                        </button>
                    </div>
                )}
                </ScrollArea>
            </div>
        </div>
    );
}
