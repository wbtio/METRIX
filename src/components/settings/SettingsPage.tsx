'use client';

import { MatrixManifestoDialog } from '@/components/login/MatrixManifestoDialog';
import { useState, useEffect, useRef, useCallback } from 'react';
import {
    Sun, Moon, Globe, Target, Bell, BellOff, Flame, Crown, LogOut, User, Camera, Trash2, ScrollText, Download, Loader2, Send, MessageCircle, Clock, CircleHelp, CheckCircle2, Bot, Plus, ChevronDown, ChevronUp
} from 'lucide-react';
import { translations, type Language } from '@/lib/translations';
import { createClient } from '@/utils/supabase/client';
import { cn } from '@/lib/utils';
import { isNotificationsEnabled, setNotificationsEnabled, getNotificationPermission } from '@/hooks/useStreakReminder';
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
    const [notifEnabled, setNotifEnabled] = useState(false);
    const [notifPermission, setNotifPermission] = useState<NotificationPermission | 'unsupported'>('default');
    const [isManifestoOpen, setIsManifestoOpen] = useState(false);

    // Telegram state
    const [telegramLinked, setTelegramLinked] = useState(false);
    const [telegramUsername, setTelegramUsername] = useState<string | null>(null);
    const [telegramDeepLink, setTelegramDeepLink] = useState<string | null>(null);
    const [telegramLinkCode, setTelegramLinkCode] = useState<string | null>(null);
    const [telegramLoading, setTelegramLoading] = useState(false);
    const [telegramGuideOpen, setTelegramGuideOpen] = useState(false);
    const [telegramError, setTelegramError] = useState<string | null>(null);

    // Per-goal reminders state
    interface GoalReminder {
        id: string;
        goal_id: string;
        reminder_time: string;
        reminder_count: number;
        enabled: boolean;
    }
    const [goalReminders, setGoalReminders] = useState<GoalReminder[]>([]);
    const [expandedGoalId, setExpandedGoalId] = useState<string | null>(null);

    const getLocalTimezone = () => {
        if (typeof Intl === 'undefined') return 'UTC';
        return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    };

    const persistTelegramPreferences = async (updates: Record<string, unknown> = {}) => {
        try {
            await fetch('/api/telegram/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    timezone: getLocalTimezone(),
                    language,
                    ...updates,
                }),
            });
        } catch (error) {
            console.error('Error saving Telegram preferences:', error);
        }
    };

    const fetchGoalReminders = async () => {
        try {
            const res = await fetch('/api/goal-reminders');
            if (res.ok) {
                const data = await res.json();
                setGoalReminders(data.data || []);
            }
        } catch (error) {
            console.error('Error fetching goal reminders:', error);
        }
    };

    const handleAddGoalReminder = async (goalId: string) => {
        try {
            const res = await fetch('/api/goal-reminders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    goalId,
                    reminderTime: '21:00',
                    reminderCount: 3,
                    timezone: getLocalTimezone(),
                }),
            });
            if (res.ok) {
                await fetchGoalReminders();
            }
        } catch (error) {
            console.error('Error adding goal reminder:', error);
        }
    };

    const handleUpdateGoalReminder = async (id: string, updates: Partial<GoalReminder>) => {
        try {
            const res = await fetch('/api/goal-reminders', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id,
                    ...updates,
                    timezone: updates.reminder_time ? getLocalTimezone() : undefined,
                }),
            });
            if (res.ok) {
                await fetchGoalReminders();
            }
        } catch (error) {
            console.error('Error updating goal reminder:', error);
        }
    };

    const handleDeleteGoalReminder = async (id: string) => {
        try {
            const res = await fetch(`/api/goal-reminders?id=${id}`, { method: 'DELETE' });
            if (res.ok) {
                setGoalReminders(prev => prev.filter(r => r.id !== id));
            }
        } catch (error) {
            console.error('Error deleting goal reminder:', error);
        }
    };

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

    const fetchTelegramStatus = useCallback(async () => {
        try {
            const res = await fetch('/api/telegram/status');
            if (res.ok) {
                const data = await res.json();
                setTelegramLinked(data.linked);
                setTelegramUsername(data.username);
                if (data.linked) {
                    setTelegramDeepLink(null);
                    setTelegramLinkCode(null);
                }
            }
        } catch (error) {
            console.error('Error fetching Telegram status:', error);
        }
    }, []);

    const handleGenerateTelegramLink = async () => {
        setTelegramLoading(true);
        setTelegramError(null);
        setTelegramGuideOpen(true);
        try {
            const res = await fetch('/api/telegram/link', { method: 'POST' });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                setTelegramError(
                    data.error ||
                    (isArabic
                        ? 'تعذر إنشاء رابط تيليغرام. تأكد من إعدادات البوت وحاول مرة ثانية.'
                        : 'Could not create the Telegram link. Check bot setup and try again.')
                );
                return;
            }
            if (res.ok) {
                setTelegramDeepLink(data.deepLink);
                setTelegramLinkCode(data.code);
            }
        } catch (error) {
            console.error('Error generating Telegram link:', error);
            setTelegramError(
                isArabic
                    ? 'صار خطأ أثناء الاتصال بالسيرفر.'
                    : 'A server connection error happened.'
            );
        } finally {
            setTelegramLoading(false);
        }
    };

    const handleDisconnectTelegram = async () => {
        setTelegramLoading(true);
        try {
            const res = await fetch('/api/telegram/disconnect', { method: 'POST' });
            if (res.ok) {
                setTelegramLinked(false);
                setTelegramUsername(null);
                setTelegramDeepLink(null);
                setTelegramLinkCode(null);
            }
        } catch (error) {
            console.error('Error disconnecting Telegram:', error);
        } finally {
            setTelegramLoading(false);
        }
    };

    useEffect(() => {
        if (typeof window === 'undefined') return;
        fetchTelegramStatus();
        fetchGoalReminders();
        persistTelegramPreferences();
    }, []);

    useEffect(() => {
        if (!telegramGuideOpen || telegramLinked || !telegramDeepLink) return;

        let checks = 0;
        const intervalId = window.setInterval(async () => {
            checks += 1;
            await fetchTelegramStatus();
            if (checks >= 30) {
                window.clearInterval(intervalId);
            }
        }, 2000);

        return () => window.clearInterval(intervalId);
    }, [fetchTelegramStatus, telegramDeepLink, telegramGuideOpen, telegramLinked]);

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
        void persistTelegramPreferences({ language: lang });
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
            className="w-full max-w-4xl 2xl:max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-500 flex-1 flex flex-col"
            dir={isArabic ? 'rtl' : 'ltr'}
        >
            <MatrixManifestoDialog
                open={isManifestoOpen}
                onOpenChange={setIsManifestoOpen}
            />
            <Dialog open={telegramGuideOpen} onOpenChange={setTelegramGuideOpen}>
                <DialogContent
                    className="max-h-[90dvh] overflow-y-auto sm:max-w-xl"
                    dir={isArabic ? 'rtl' : 'ltr'}
                >
                    <DialogHeader className={isArabic ? 'sm:text-right' : undefined}>
                        <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-600/10">
                            <Bot className="h-5 w-5 text-cyan-600" />
                        </div>
                        <DialogTitle>
                            {isArabic ? 'ربط تيليغرام مع METRIX' : 'Connect Telegram to METRIX'}
                        </DialogTitle>
                        <DialogDescription>
                            {isArabic
                                ? 'اربط حسابك حتى تصلك رسالة تأكيد داخل البوت، وبعدها تذكيرات الأهداف عند الحاجة.'
                                : 'Link your account to receive a confirmation message in the bot, then goal reminders when needed.'}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-3">
                        {telegramError && (
                            <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs font-semibold leading-6 text-destructive">
                                {telegramError}
                            </div>
                        )}

                        <div className="rounded-xl border border-border bg-muted/20 p-3">
                            <div className="mb-2 flex items-center gap-2">
                                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                <p className="text-sm font-bold text-foreground">
                                    {telegramLinked
                                        ? (isArabic ? 'تم الربط' : 'Linked')
                                        : (isArabic ? 'خطوات الربط' : 'Connection steps')}
                                </p>
                            </div>
                            {telegramLinked ? (
                                <p className="text-xs leading-6 text-muted-foreground">
                                    {isArabic
                                        ? `تيليغرام مربوط الآن${telegramUsername ? ` بحساب @${telegramUsername}` : ''}. رسالة التأكيد وصلت داخل البوت.`
                                        : `Telegram is linked${telegramUsername ? ` to @${telegramUsername}` : ''}. The confirmation message was sent inside the bot.`}
                                </p>
                            ) : (
                                <ol className="space-y-2 text-xs leading-6 text-muted-foreground">
                                    <li>{isArabic ? '1. افتح البوت من الزر بالأسفل.' : '1. Open the bot from the button below.'}</li>
                                    <li>{isArabic ? '2. اضغط Start داخل تيليغرام.' : '2. Tap Start inside Telegram.'}</li>
                                    <li>{isArabic ? '3. راح توصلك رسالة تأكيد داخل البوت، والموقع يحدّث الحالة تلقائياً.' : '3. The bot will send a confirmation message, and this page will update automatically.'}</li>
                                </ol>
                            )}
                            {telegramLinkCode && (
                                <div className="mt-3 rounded-lg border border-border bg-background px-3 py-2">
                                    <p className="text-[10px] font-semibold uppercase text-muted-foreground">
                                        {isArabic ? 'كود الربط' : 'Link code'}
                                    </p>
                                    <p className="mt-1 font-mono text-sm font-bold tracking-widest text-foreground">{telegramLinkCode}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <DialogFooter className="gap-2 sm:gap-2">
                        {telegramDeepLink && !telegramLinked && (
                            <a
                                href={telegramDeepLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90"
                            >
                                <Send className="h-3.5 w-3.5" />
                                {t.openInTelegram}
                            </a>
                        )}
                        <button
                            type="button"
                            onClick={fetchTelegramStatus}
                            className="rounded-lg border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-muted/50"
                        >
                            {isArabic ? 'تحديث الحالة' : 'Refresh status'}
                        </button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <div className="bg-card/30 backdrop-blur-xl p-3 sm:p-4 rounded-[20px] sm:rounded-[28px] border border-border ring-1 ring-border/5 flex-1 flex flex-col min-h-0">
                {/* Tabs */}
                <div className="flex gap-1 mb-4 p-1 rounded-2xl bg-muted/40 border border-border/40">
                    <button
                        onClick={() => setActiveTab('general')}
                        className={cn(
                            "flex flex-1 items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200",
                            activeTab === 'general'
                                ? "bg-background/80 text-foreground shadow-sm ring-1 ring-border/60"
                                : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                        )}
                    >
                        <Globe className="w-4 h-4" />
                        {t.generalSettings}
                    </button>
                    <button
                        onClick={() => setActiveTab('profile')}
                        className={cn(
                            "flex flex-1 items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200",
                            activeTab === 'profile'
                                ? "bg-background/80 text-foreground shadow-sm ring-1 ring-border/60"
                                : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                        )}
                    >
                        <User className="w-4 h-4" />
                        {t.profileSettings}
                    </button>
                </div>

                <ScrollArea className="flex-1 min-h-0" dir={isArabic ? 'rtl' : 'ltr'}>
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

                        {/* Per-Goal Reminders */}
                        <div className="w-full border-b border-border/50 p-3 sm:p-4">
                            <div className="flex items-center gap-2.5">
                                <div className="shrink-0 w-8 h-8 rounded-lg bg-cyan-600/10 flex items-center justify-center">
                                    <Clock className="w-3.5 h-3.5 text-cyan-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-bold text-foreground text-sm">{t.goalReminders}</p>
                                    <p className="text-[10px] text-muted-foreground">{t.goalRemindersDesc}</p>
                                </div>
                                <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                                    <span className={cn(
                                        "rounded-full border px-2 py-1 text-[10px] font-bold",
                                        notifEnabled
                                            ? "border-cyan-600/20 bg-cyan-600/10 text-cyan-700 dark:text-cyan-300"
                                            : "border-border bg-muted/30 text-muted-foreground"
                                    )}>
                                        {isArabic ? 'المتصفح' : 'Browser'}
                                    </span>
                                    <span className={cn(
                                        "rounded-full border px-2 py-1 text-[10px] font-bold",
                                        telegramLinked
                                            ? "border-emerald-600/20 bg-emerald-600/10 text-emerald-700 dark:text-emerald-300"
                                            : "border-border bg-muted/30 text-muted-foreground"
                                    )}>
                                        {telegramLinked ? (isArabic ? 'تيليغرام متصل' : 'Telegram linked') : (isArabic ? 'تيليغرام غير متصل' : 'Telegram off')}
                                    </span>
                                </div>
                            </div>
                            {!telegramLinked && (
                                <div className="mt-3 rounded-xl border border-cyan-600/15 bg-cyan-600/5 px-3 py-2 text-[11px] font-medium leading-5 text-muted-foreground">
                                    {isArabic
                                        ? 'اربط تيليغرام حتى تصلك التذكيرات داخل البوت إذا إشعارات المتصفح غير متاحة.'
                                        : 'Link Telegram to receive reminders in the bot when browser notifications are unavailable.'}
                                </div>
                            )}

                            <div className="mt-3 space-y-2.5">
                                {goals.length === 0 ? (
                                    <p className="py-3 text-center text-xs text-muted-foreground">
                                        {t.noGoalsProfileHint}
                                    </p>
                                ) : (
                                    goals.map((goal) => {
                                        const GoalIcon = getIconComponent(goal.icon || 'Target');
                                        const remindersForGoal = goalReminders.filter((r) => r.goal_id === goal.id);
                                        const reminderCount = remindersForGoal.length;
                                        const isExpanded = expandedGoalId === goal.id;

                                        return (
                                            <div
                                                key={goal.id}
                                                className="rounded-xl border border-border/60 bg-background/70 p-3"
                                            >
                                                <div className="flex items-center justify-between gap-3">
                                                    <div className="flex min-w-0 items-center gap-3">
                                                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                                                            <GoalIcon className="h-4 w-4 text-primary" />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <h4 className="truncate text-sm font-bold text-foreground">
                                                                {goal.title}
                                                            </h4>
                                                            <p className="mt-0.5 text-[10px] text-muted-foreground">
                                                                {isArabic
                                                                    ? `${reminderCount} ${reminderCount === 1 ? 'تذكير' : 'تذكيرات'}`
                                                                    : `${reminderCount} ${reminderCount === 1 ? 'reminder' : 'reminders'}`}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            setExpandedGoalId((prev) =>
                                                                prev === goal.id ? null : goal.id,
                                                            )
                                                        }
                                                        className="shrink-0 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
                                                        aria-label={isArabic ? 'تبديل عرض الأوقات' : 'Toggle reminder times'}
                                                    >
                                                        {isExpanded ? (
                                                            <ChevronUp className="h-4 w-4" />
                                                        ) : (
                                                            <ChevronDown className="h-4 w-4" />
                                                        )}
                                                    </button>
                                                </div>

                                                {isExpanded && (
                                                    <div className="mt-2.5">
                                                        {reminderCount === 0 ? (
                                                            <div className="rounded-lg border border-dashed border-border/50 px-3 py-2 text-[11px] text-muted-foreground">
                                                                {isArabic
                                                                    ? 'لا توجد أوقات مضافة لهذا الهدف.'
                                                                    : 'No reminder times for this goal.'}
                                                            </div>
                                                        ) : (
                                                            <div className="space-y-1.5">
                                                                {remindersForGoal.map((reminder) => (
                                                                    <div
                                                                        key={reminder.id}
                                                                        className="grid h-9 grid-cols-[minmax(0,1fr)_92px_30px] items-center gap-1 rounded-md border border-border/60 bg-background/80 p-0.5 shadow-xs"
                                                                    >
                                                                        <div className="flex h-8 min-w-0 items-center gap-1 rounded-[6px] bg-background px-2">
                                                                            <Clock className="h-3 w-3 shrink-0 text-muted-foreground" />
                                                                            <Input
                                                                                type="time"
                                                                                value={reminder.reminder_time}
                                                                                onChange={(e) =>
                                                                                    handleUpdateGoalReminder(reminder.id, {
                                                                                        reminder_time: e.target.value,
                                                                                    })
                                                                                }
                                                                                aria-label={isArabic ? 'وقت التذكير' : 'Reminder time'}
                                                                                className="h-7 min-w-0 flex-1 border-0 bg-transparent px-0 text-xs font-bold shadow-none focus-visible:ring-0"
                                                                            />
                                                                        </div>
                                                                        <Select
                                                                            value={String(reminder.reminder_count)}
                                                                            onValueChange={(value) =>
                                                                                handleUpdateGoalReminder(reminder.id, {
                                                                                    reminder_count: Number(value),
                                                                                })
                                                                            }
                                                                        >
                                                                            <SelectTrigger
                                                                                size="sm"
                                                                                aria-label={isArabic ? 'عدد التذكيرات' : 'Reminder attempts'}
                                                                                className="h-8 w-full border-border/70 bg-background px-2 text-xs font-bold shadow-none"
                                                                            >
                                                                                <SelectValue />
                                                                            </SelectTrigger>
                                                                            <SelectContent>
                                                                                {[1, 2, 3, 4, 5].map((n) => (
                                                                                    <SelectItem key={n} value={String(n)}>
                                                                                        {n} {t.times}
                                                                                    </SelectItem>
                                                                                ))}
                                                                            </SelectContent>
                                                                        </Select>
                                                                        <Button
                                                                            type="button"
                                                                            variant="ghost"
                                                                            size="icon-xs"
                                                                            onClick={() => handleDeleteGoalReminder(reminder.id)}
                                                                            className="h-8 w-[30px] text-destructive hover:bg-destructive/10 hover:text-destructive"
                                                                            title={isArabic ? 'حذف' : 'Remove'}
                                                                        >
                                                                            <Trash2 className="h-3.5 w-3.5" />
                                                                        </Button>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}

                                                        <Button
                                                            type="button"
                                                            variant="secondary"
                                                            size="sm"
                                                            onClick={() => handleAddGoalReminder(goal.id)}
                                                            className="mt-2.5 h-8 w-full bg-primary/10 text-xs font-bold text-primary hover:bg-primary/20"
                                                        >
                                                            <Plus className="me-1 h-3 w-3" />
                                                            {t.addTime}
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>

                        {/* Telegram Bot */}
                        <div className="p-3 sm:p-3.5 border-b border-border/50 hover:bg-muted/10 transition-colors">
                            <div className="flex items-center gap-2.5">
                                <div className="shrink-0 w-8 h-8 rounded-lg bg-cyan-600/10 flex items-center justify-center">
                                    <MessageCircle className="w-3.5 h-3.5 text-cyan-600" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="font-bold text-foreground text-sm leading-tight">{t.telegramBot}</p>
                                    <p className="truncate text-[10px] text-muted-foreground">{t.telegramBotDesc}</p>
                                </div>
                                <div className="flex min-w-0 shrink-0 items-center gap-1.5">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="icon-sm"
                                        onClick={() => setTelegramGuideOpen(true)}
                                        className="bg-background/70 text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                                        title={isArabic ? 'شرح الربط' : 'Connection guide'}
                                    >
                                        <CircleHelp className="h-3.5 w-3.5" />
                                    </Button>
                                    {telegramLinked ? (
                                        <div className="flex h-8 min-w-0 items-center overflow-hidden rounded-lg border border-border bg-background/75">
                                            <span className="max-w-[120px] truncate border-e border-border px-2 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                                                {telegramUsername ? `@${telegramUsername}` : t.telegramConnected}
                                            </span>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={handleDisconnectTelegram}
                                                disabled={telegramLoading}
                                                className="h-8 rounded-none px-2 text-xs font-bold text-destructive hover:bg-destructive/10 hover:text-destructive"
                                            >
                                                {telegramLoading ? '...' : t.disconnectTelegram}
                                            </Button>
                                        </div>
                                    ) : telegramDeepLink ? (
                                        <Button
                                            asChild
                                            size="sm"
                                            className="h-8 shrink-0 px-2 text-xs font-bold"
                                        >
                                            <a
                                            href={telegramDeepLink}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            >
                                                <Send className="w-3 h-3" />
                                                {t.openInTelegram}
                                            </a>
                                        </Button>
                                    ) : (
                                        <Button
                                            type="button"
                                            size="sm"
                                            onClick={handleGenerateTelegramLink}
                                            disabled={telegramLoading}
                                            className="h-8 shrink-0 px-2 text-xs font-bold"
                                        >
                                            {telegramLoading ? '...' : t.connectTelegram}
                                        </Button>
                                    )}
                                </div>
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
                    <div className="space-y-6 px-1 py-1 sm:px-2">
                        {/* Profile section */}
                        <section className="space-y-5">
                            {profileMessage && (
                                <div className={cn(
                                    "text-xs font-medium px-3 py-1.5 rounded-lg",
                                    profileMessage.type === 'success' ? "bg-emerald-500/10 text-emerald-600" : "bg-destructive/10 text-destructive"
                                )}>
                                    {profileMessage.text}
                                </div>
                            )}

                            {/* Profile Picture + Name Row */}
                            <div className="flex items-center gap-4 rounded-2xl bg-background/55 px-3 py-3 ring-1 ring-border/40">
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
                            <div className="border-t border-border/60 pt-4">
                                <div className="mb-2 flex items-center justify-between">
                                    <p className="flex items-center gap-1.5 text-sm font-bold text-foreground">
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
                                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                                    <div className="rounded-xl bg-background/55 px-2 py-2.5 text-center ring-1 ring-border/45">
                                        <p className="text-base font-black leading-tight text-foreground">{goals.length}</p>
                                        <p className={cn("text-[10px] leading-tight font-semibold text-muted-foreground", !isArabic && "uppercase")}>{t.goalsCreated}</p>
                                    </div>
                                    <div className="rounded-xl bg-background/55 px-2 py-2.5 text-center ring-1 ring-border/45">
                                        <p className="text-base font-black leading-tight text-foreground">{completedGoals}</p>
                                        <p className={cn("text-[10px] leading-tight font-semibold text-muted-foreground", !isArabic && "uppercase")}>{t.completedGoals}</p>
                                    </div>
                                    <div className="rounded-xl bg-background/55 px-2 py-2.5 text-center ring-1 ring-border/45">
                                        <p className="text-base font-black leading-tight text-foreground">{totalPointsEarned >= 1000 ? (totalPointsEarned / 1000).toFixed(1) + 'k' : totalPointsEarned}</p>
                                        <p className={cn("text-[10px] leading-tight font-semibold text-muted-foreground", !isArabic && "uppercase")}>{t.totalPointsEarned}</p>
                                    </div>
                                    <div className="rounded-xl bg-background/55 px-2 py-2.5 text-center ring-1 ring-border/45">
                                        <p className="text-base font-black leading-tight text-foreground">{totalLogs}</p>
                                        <p className={cn("text-[10px] leading-tight font-semibold text-muted-foreground", !isArabic && "uppercase")}>{t.totalLogsRecorded}</p>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* My Goals — Compact Export Section */}
                        <section className="border-t border-border/60 pt-1">
                            <p className="mb-2 flex items-center gap-1.5 text-sm font-bold text-foreground">
                                <Target className="w-3.5 h-3.5 text-primary" />
                                {t.myGoalsSection}
                            </p>
                            {goals.length === 0 ? (
                                <p className="text-xs text-muted-foreground text-center py-3">{t.noGoalsProfileHint}</p>
                            ) : (
                                <div className="space-y-2">
                                    {goals.map((goal) => {
                                        const GoalIcon = getIconComponent(goal.icon || 'Target');
                                        const isExporting = exportingGoalId === goal.id;

                                        return (
                                            <div
                                                key={goal.id}
                                                className="flex items-center gap-3 rounded-xl bg-background/55 px-3 py-2.5 ring-1 ring-border/40 transition-all hover:bg-muted/20"
                                            >
                                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
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
                        </section>

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
                </ScrollArea>
            </div>
        </div>
    );
}
