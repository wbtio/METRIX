'use client';

import { MatrixManifestoDialog } from '@/components/login/MatrixManifestoDialog';
import { useState, useEffect, useRef } from 'react';
import {
    Sun, Moon, Globe, Target, Bell, BellOff, Flame, Crown, LogOut, User, Camera, Trash2, ScrollText, Download, Loader2
} from 'lucide-react';
import { translations, type Language } from '@/lib/translations';
import { createClient } from '@/utils/supabase/client';
import { cn } from '@/lib/utils';
import { isNotificationsEnabled, setNotificationsEnabled, getNotificationPermission } from '@/hooks/useStreakReminder';
import { getIconComponent } from '@/components/goal/IconPicker';
import { buildTaskHierarchy, type TaskRow } from '@/lib/task-hierarchy';
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
    const [notifEnabled, setNotifEnabled] = useState(false);
    const [notifPermission, setNotifPermission] = useState<NotificationPermission | 'unsupported'>('default');
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
        setNotifEnabled(isNotificationsEnabled());
        setNotifPermission(getNotificationPermission());
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

    const handleToggleNotifications = async () => {
        if (notifEnabled) {
            await setNotificationsEnabled(false);
            setNotifEnabled(false);
        } else {
            const granted = await setNotificationsEnabled(true);
            setNotifEnabled(granted);
            setNotifPermission(getNotificationPermission());
        }
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

                let currentMonth = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
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
            className="w-full max-w-4xl 2xl:max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-500"
            dir={isArabic ? 'rtl' : 'ltr'}
        >
            <MatrixManifestoDialog
                open={isManifestoOpen}
                onOpenChange={setIsManifestoOpen}
            />

            <div className="bg-card/30 backdrop-blur-xl p-3 sm:p-4 rounded-[20px] sm:rounded-[28px] border border-border ring-1 ring-border/5 shadow-2xl">
                {/* Tabs */}
                <div className="flex gap-2 mb-4 border-b border-border/50 pb-3">
                    <button
                        onClick={() => setActiveTab('general')}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all",
                            activeTab === 'general'
                                ? "bg-primary text-primary-foreground"
                                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                        )}
                    >
                        <Globe className="w-4 h-4" />
                        {t.generalSettings}
                    </button>
                    <button
                        onClick={() => setActiveTab('profile')}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all",
                            activeTab === 'profile'
                                ? "bg-primary text-primary-foreground"
                                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                        )}
                    >
                        <User className="w-4 h-4" />
                        {t.profileSettings}
                    </button>
                </div>

                {activeTab === 'general' ? (
                    <div className="bg-card/40 rounded-2xl border border-border overflow-hidden">
                        <div className="p-3 sm:p-4 flex flex-row items-center justify-between gap-3 border-b border-border/50 hover:bg-muted/10 transition-colors">
                            <div className="flex items-center gap-2.5 flex-1 min-w-0">
                                <div className="shrink-0 w-8 h-8 rounded-lg bg-cyan-600/10 flex items-center justify-center">
                                    {theme === 'dark' ? <Moon className="w-3.5 h-3.5 text-cyan-600" /> : <Sun className="w-3.5 h-3.5 text-cyan-600" />}
                                </div>
                                <p className="font-bold text-foreground text-sm">{t.appearance}</p>
                            </div>
                            <div className="flex gap-1 shrink-0 bg-muted/30 p-0.5 rounded-lg">
                                <button
                                    onClick={() => handleThemeChange('light')}
                                    className={cn(
                                        "flex items-center justify-center w-8 h-8 sm:w-auto sm:h-auto sm:px-2.5 sm:py-1 rounded-md text-xs font-semibold transition-all duration-200",
                                        theme === 'light' ? "bg-background text-cyan-600 shadow-sm ring-1 ring-border" : "text-muted-foreground hover:text-foreground"
                                    )}
                                    title={t.lightMode}
                                >
                                    <Sun className="w-3.5 h-3.5 sm:mr-1 rtl:sm:ml-1 rtl:sm:mr-0" />
                                    <span className="hidden sm:inline">{t.lightMode}</span>
                                </button>
                                <button
                                    onClick={() => handleThemeChange('dark')}
                                    className={cn(
                                        "flex items-center justify-center w-8 h-8 sm:w-auto sm:h-auto sm:px-2.5 sm:py-1 rounded-md text-xs font-semibold transition-all duration-200",
                                        theme === 'dark' ? "bg-background text-cyan-600 shadow-sm ring-1 ring-border" : "text-muted-foreground hover:text-foreground"
                                    )}
                                    title={t.darkMode}
                                >
                                    <Moon className="w-3.5 h-3.5 sm:mr-1 rtl:sm:ml-1 rtl:sm:mr-0" />
                                    <span className="hidden sm:inline">{t.darkMode}</span>
                                </button>
                            </div>
                        </div>

                        <div className="p-3 sm:p-4 flex flex-row items-center justify-between gap-3 border-b border-border/50 hover:bg-muted/10 transition-colors">
                            <div className="flex items-center gap-2.5 flex-1 min-w-0">
                                <div className="shrink-0 w-8 h-8 rounded-lg bg-cyan-600/10 flex items-center justify-center">
                                    <Globe className="w-3.5 h-3.5 text-cyan-600" />
                                </div>
                                <p className="font-bold text-foreground text-sm">{t.language}</p>
                            </div>
                            <div className="flex gap-1 shrink-0 bg-muted/30 p-0.5 rounded-lg">
                                <button
                                    onClick={() => handleLanguageChange('en')}
                                    className={cn(
                                        "flex items-center justify-center w-8 h-8 sm:w-auto sm:h-auto sm:px-2.5 sm:py-1 rounded-md text-xs font-semibold transition-all duration-200",
                                        language === 'en' ? "bg-background text-foreground shadow-sm ring-1 ring-border" : "text-muted-foreground hover:text-foreground"
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
                                        language === 'ar' ? "bg-background text-foreground shadow-sm ring-1 ring-border" : "text-muted-foreground hover:text-foreground"
                                    )}
                                    title={t.arabic}
                                >
                                    <span className="sm:hidden font-bold">AR</span>
                                    <span className="hidden sm:inline">{t.arabic}</span>
                                </button>
                            </div>
                        </div>

                        <div className="p-3 sm:p-4 flex flex-row items-center justify-between gap-3 hover:bg-muted/10 transition-colors">
                            <div className="flex items-center gap-2.5 flex-1 min-w-0">
                                <div className={cn("shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-colors", notifEnabled ? "bg-cyan-600/10" : "bg-muted/50")}>
                                    {notifEnabled ? <Bell className="w-3.5 h-3.5 text-cyan-600" /> : <BellOff className="w-3.5 h-3.5 text-muted-foreground" />}
                                </div>
                                <p className="font-bold text-foreground text-sm">{t.notifications}</p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                {notifPermission === 'unsupported' ? (
                                    <span className="text-[10px] text-muted-foreground/60 font-medium bg-muted/30 px-2 py-0.5 rounded">{t.notificationsUnsupported}</span>
                                ) : notifPermission === 'denied' ? (
                                    <span className="text-[10px] text-destructive/70 font-medium bg-destructive/10 px-2 py-0.5 rounded">{t.notificationsBlocked}</span>
                                ) : (
                                    <button
                                        onClick={handleToggleNotifications}
                                        className={cn(
                                            "relative w-9 h-5 rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary/30",
                                            notifEnabled ? "bg-cyan-600" : "bg-muted-foreground/40"
                                        )}
                                        role="switch"
                                        aria-checked={notifEnabled}
                                        title={notifEnabled ? t.notificationsEnabled : t.notificationsDisabled}
                                    >
                                        <span className={cn(
                                            "absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all duration-300",
                                            notifEnabled ? "ltr:left-[calc(100%-18px)] rtl:right-[calc(100%-18px)]" : "ltr:left-0.5 rtl:right-0.5"
                                        )} />
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="border-t border-border/50 bg-gradient-to-r from-background/10 via-muted/10 to-background/10 p-3 sm:p-4">
                            <div className="flex items-center gap-3">
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-950/[0.04] dark:border-white/10 dark:bg-white/6">
                                    <ScrollText className="h-3.5 w-3.5 text-slate-700 dark:text-slate-200" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-bold text-foreground text-sm">{t.matrixStory}</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setIsManifestoOpen(true)}
                                    className="shrink-0 rounded-lg border border-border bg-background/80 px-3 py-1.5 text-xs font-semibold text-foreground shadow-sm transition-all hover:bg-background"
                                >
                                    {t.readStory}
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {/* Profile section */}
                        <div className="bg-card/40 rounded-2xl border border-border p-3 sm:p-4 space-y-4">
                            {profileMessage && (
                                <div className={cn(
                                    "text-xs font-medium px-3 py-1.5 rounded-lg",
                                    profileMessage.type === 'success' ? "bg-emerald-500/10 text-emerald-600" : "bg-destructive/10 text-destructive"
                                )}>
                                    {profileMessage.text}
                                </div>
                            )}

                            {/* Profile Picture + Name Row */}
                            <div className="flex items-center gap-3">
                                <div className="relative group shrink-0">
                                    <div className="w-14 h-14 rounded-full overflow-hidden bg-muted/50 border-2 border-border flex items-center justify-center">
                                        {avatarUrl ? (
                                            <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="text-xl font-black text-muted-foreground">
                                                {displayName?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
                                            </span>
                                        )}
                                    </div>
                                    <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
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
                                            className="p-1 rounded-full bg-background/80 hover:bg-background transition-colors"
                                            title={t.changePhoto}
                                        >
                                            <Camera className="w-3 h-3" />
                                        </button>
                                        {avatarUrl && (
                                            <button
                                                onClick={handleRemovePhoto}
                                                disabled={updatingProfile}
                                                className="p-1 rounded-full bg-destructive/80 hover:bg-destructive text-white transition-colors"
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
                                            className="flex-1 min-w-0 px-3 py-1.5 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                                        />
                                        <button
                                            onClick={handleDisplayNameSave}
                                            disabled={updatingProfile}
                                            className="shrink-0 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                                        >
                                            {updatingProfile ? '...' : t.saveChanges}
                                        </button>
                                    </div>
                                    <p className="text-[11px] text-muted-foreground mt-1 truncate">{user?.email || '—'}</p>
                                </div>
                            </div>

                            {/* Account Stats — Ultra Compact */}
                            <div className="pt-2 border-t border-border">
                                <div className="flex items-center justify-between mb-1.5">
                                    <p className="font-bold text-foreground text-xs flex items-center gap-1.5">
                                        <Target className="w-3 h-3 text-primary" />
                                        {t.account}
                                    </p>
                                    <div className="flex gap-1">
                                        {maxStreak >= 7 && (
                                            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-cyan-500 to-cyan-700 flex items-center justify-center shadow-sm ring-1 ring-background" title={isArabic ? "شعلة المواظبة: 7 أيام" : "Consistency Flame: 7 Days"}>
                                                <Flame className="w-2.5 h-2.5 text-white" />
                                            </div>
                                        )}
                                        {maxStreak >= 30 && (
                                            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-yellow-300 to-amber-500 flex items-center justify-center shadow-sm ring-1 ring-background" title={isArabic ? "تاج الالتزام: 30 يوماً" : "Crown of Commitment: 30 Days"}>
                                                <Crown className="w-2.5 h-2.5 text-white" />
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="grid grid-cols-4 gap-1">
                                    <div className="bg-muted/30 rounded-md px-1 py-1.5 text-center border border-border/50">
                                        <p className="text-sm font-black text-foreground leading-tight">{goals.length}</p>
                                        <p className={cn("text-[9px] leading-tight font-semibold text-muted-foreground", !isArabic && "uppercase")}>{t.goalsCreated}</p>
                                    </div>
                                    <div className="bg-muted/30 rounded-md px-1 py-1.5 text-center border border-border/50">
                                        <p className="text-sm font-black text-foreground leading-tight">{completedGoals}</p>
                                        <p className={cn("text-[9px] leading-tight font-semibold text-muted-foreground", !isArabic && "uppercase")}>{t.completedGoals}</p>
                                    </div>
                                    <div className="bg-muted/30 rounded-md px-1 py-1.5 text-center border border-border/50">
                                        <p className="text-sm font-black text-foreground leading-tight">{totalPointsEarned >= 1000 ? (totalPointsEarned / 1000).toFixed(1) + 'k' : totalPointsEarned}</p>
                                        <p className={cn("text-[9px] leading-tight font-semibold text-muted-foreground", !isArabic && "uppercase")}>{t.totalPointsEarned}</p>
                                    </div>
                                    <div className="bg-muted/30 rounded-md px-1 py-1.5 text-center border border-border/50">
                                        <p className="text-sm font-black text-foreground leading-tight">{totalLogs}</p>
                                        <p className={cn("text-[9px] leading-tight font-semibold text-muted-foreground", !isArabic && "uppercase")}>{t.totalLogsRecorded}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* My Goals — Compact Export Section */}
                        <div className="bg-card/40 rounded-2xl border border-border p-3 sm:p-4">
                            <p className="font-bold text-foreground text-sm mb-2 flex items-center gap-1.5">
                                <Target className="w-3.5 h-3.5 text-primary" />
                                {t.myGoalsSection}
                            </p>
                            {goals.length === 0 ? (
                                <p className="text-xs text-muted-foreground text-center py-3">{t.noGoalsProfileHint}</p>
                            ) : (
                                <div className="space-y-1.5">
                                    {goals.map((goal) => {
                                        const GoalIcon = getIconComponent(goal.icon || 'Target');
                                        const isExporting = exportingGoalId === goal.id;

                                        return (
                                            <div
                                                key={goal.id}
                                                className="flex items-center gap-2 rounded-lg border border-border/60 bg-background/60 px-2.5 py-2 transition-all hover:bg-muted/20"
                                            >
                                                <div className="shrink-0 w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center">
                                                    <GoalIcon className="w-3.5 h-3.5 text-primary" />
                                                </div>
                                                <p className="flex-1 min-w-0 text-sm font-semibold text-foreground truncate">{goal.title}</p>
                                                <button
                                                    onClick={() => handleExportGoal(goal)}
                                                    disabled={!!exportingGoalId}
                                                    className={cn(
                                                        "shrink-0 flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold transition-all duration-200",
                                                        isExporting
                                                            ? "bg-primary/10 text-primary cursor-wait"
                                                            : "bg-muted/40 text-muted-foreground hover:bg-primary/10 hover:text-primary border border-border/50"
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
                        </div>

                        {/* Sign Out */}
                        <button
                            onClick={handleSignOut}
                            disabled={signingOut}
                            className={cn(
                                "w-full flex items-center justify-center gap-1.5 p-2.5 rounded-xl border transition-all duration-200 font-bold text-xs shrink-0",
                                signingOut
                                    ? "bg-muted/30 border-border text-muted-foreground cursor-not-allowed"
                                    : "bg-destructive/5 border-destructive/20 text-destructive hover:bg-destructive hover:text-destructive-foreground hover:border-destructive"
                            )}
                        >
                            {signingOut ? (
                                <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <LogOut className="w-3.5 h-3.5" />
                            )}
                            {signingOut ? t.signingOut : t.signOut}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
