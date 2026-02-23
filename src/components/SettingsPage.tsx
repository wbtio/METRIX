'use client';

import { useState, useEffect } from 'react';
import {
    Sun, Moon, Globe, Check, Target, Sparkles, BarChart2, LogOut, Bell, BellOff
} from 'lucide-react';
import { translations, type Language } from '@/lib/translations';
import { createClient } from '@/utils/supabase/client';
import { cn } from '@/lib/utils';
import { isNotificationsEnabled, setNotificationsEnabled, getNotificationPermission } from '@/hooks/useStreakReminder';

interface Goal {
    id: string;
    title: string;
    current_points: number;
    target_points: number;
    status: string;
    created_at: string;
}

interface SettingsPageProps {
    language: Language;
    setLanguage: (lang: Language) => void;
    goals: Goal[];
    onGoalsDeleted?: () => void;
}

export default function SettingsPage({ language, setLanguage, goals }: SettingsPageProps) {
    const t = translations[language];
    const isArabic = language === 'ar';
    const supabase = createClient();

    const [theme, setTheme] = useState<'light' | 'dark'>('light');
    const [totalLogs, setTotalLogs] = useState(0);
    const [signingOut, setSigningOut] = useState(false);
    const [notifEnabled, setNotifEnabled] = useState(false);
    const [notifPermission, setNotifPermission] = useState<NotificationPermission | 'unsupported'>('default');

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
        if (savedTheme) setTheme(savedTheme);
        setNotifEnabled(isNotificationsEnabled());
        setNotifPermission(getNotificationPermission());
        fetchTotalLogs();
    }, []);

    const fetchTotalLogs = async () => {
        try {
            const { count, error } = await supabase
                .from('daily_logs')
                .select('id', { count: 'exact' });

            if (error) {
                setTotalLogs(0);
                return;
            }

            setTotalLogs(count ?? 0);
        } catch {
            setTotalLogs(0);
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
            // Disable
            await setNotificationsEnabled(false);
            setNotifEnabled(false);
        } else {
            // Enable (will request permission if needed)
            const granted = await setNotificationsEnabled(true);
            setNotifEnabled(granted);
            setNotifPermission(getNotificationPermission());
        }
    };

    // Stats
    const completedGoals = goals.filter(g => g.current_points >= g.target_points).length;
    const totalPointsEarned = goals.reduce((sum, g) => sum + (g.current_points || 0), 0);

    return (
        <div
            className="w-full max-w-3xl animate-in fade-in slide-in-from-bottom-8 duration-500"
            dir={isArabic ? 'rtl' : 'ltr'}
        >
            <div className="bg-card/30 backdrop-blur-xl p-4 sm:p-6 lg:p-8 rounded-[20px] sm:rounded-[32px] border border-border ring-1 ring-border/5 shadow-2xl space-y-4 sm:space-y-6">
                {/* Header */}
                <div>
                    <h2 className="text-2xl sm:text-3xl font-black text-foreground mb-1">{t.settings}</h2>
                    <p className="text-sm text-muted-foreground">{t.settingsSubtitle}</p>
                </div>

                <div className="space-y-4">
                    {/* ── Appearance ── */}
                    <div className="p-4 sm:p-5 bg-card/40 rounded-2xl border border-border hover:border-primary/20 transition-all">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                <div className="shrink-0 w-10 h-10 rounded-xl bg-amber-500/10 dark:bg-indigo-500/10 flex items-center justify-center">
                                    {theme === 'dark' ? (
                                        <Moon className="w-5 h-5 text-indigo-500" />
                                    ) : (
                                        <Sun className="w-5 h-5 text-amber-500" />
                                    )}
                                </div>
                                <div className="min-w-0">
                                    <p className="font-bold text-foreground text-sm">{t.appearance}</p>
                                    <p className="text-xs text-muted-foreground mt-0.5">{t.appearanceDesc}</p>
                                </div>
                            </div>

                            <div className="flex gap-1.5 shrink-0 self-end sm:self-auto">
                                <button
                                    onClick={() => handleThemeChange('light')}
                                    className={cn(
                                        "flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-200",
                                        theme === 'light'
                                            ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 ring-1 ring-amber-500/30"
                                            : "bg-muted/50 text-muted-foreground hover:bg-muted"
                                    )}
                                >
                                    <Sun className="w-3.5 h-3.5" />
                                    {t.lightMode}
                                </button>
                                <button
                                    onClick={() => handleThemeChange('dark')}
                                    className={cn(
                                        "flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-200",
                                        theme === 'dark'
                                            ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 ring-1 ring-indigo-500/30"
                                            : "bg-muted/50 text-muted-foreground hover:bg-muted"
                                    )}
                                >
                                    <Moon className="w-3.5 h-3.5" />
                                    {t.darkMode}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* ── Language ── */}
                    <div className="p-4 sm:p-5 bg-card/40 rounded-2xl border border-border hover:border-primary/20 transition-all">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                <div className="shrink-0 w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                                    <Globe className="w-5 h-5 text-blue-500" />
                                </div>
                                <div className="min-w-0">
                                    <p className="font-bold text-foreground text-sm">{t.language}</p>
                                    <p className="text-xs text-muted-foreground mt-0.5">{t.languageDesc}</p>
                                </div>
                            </div>

                            <div className="flex gap-1.5 shrink-0 self-end sm:self-auto">
                                <button
                                    onClick={() => handleLanguageChange('en')}
                                    className={cn(
                                        "flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-200",
                                        language === 'en'
                                            ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                                            : "bg-muted/50 text-muted-foreground hover:bg-muted"
                                    )}
                                >
                                    {language === 'en' && <Check className="w-3 h-3" />}
                                    {t.english}
                                </button>
                                <button
                                    onClick={() => handleLanguageChange('ar')}
                                    className={cn(
                                        "flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-200",
                                        language === 'ar'
                                            ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                                            : "bg-muted/50 text-muted-foreground hover:bg-muted"
                                    )}
                                >
                                    {language === 'ar' && <Check className="w-3 h-3" />}
                                    {t.arabic}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* ── Notifications ── */}
                    <div className="p-4 sm:p-5 bg-card/40 rounded-2xl border border-border hover:border-primary/20 transition-all">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                <div className={cn(
                                    "shrink-0 w-10 h-10 rounded-xl flex items-center justify-center",
                                    notifEnabled
                                        ? "bg-orange-500/10"
                                        : "bg-muted/50"
                                )}>
                                    {notifEnabled ? (
                                        <Bell className="w-5 h-5 text-orange-500" />
                                    ) : (
                                        <BellOff className="w-5 h-5 text-muted-foreground" />
                                    )}
                                </div>
                                <div className="min-w-0">
                                    <p className="font-bold text-foreground text-sm">{t.notifications}</p>
                                    <p className="text-xs text-muted-foreground mt-0.5">{t.notificationsDesc}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                                {notifPermission === 'unsupported' ? (
                                    <span className="text-xs text-muted-foreground/60 font-medium">
                                        {t.notificationsUnsupported}
                                    </span>
                                ) : notifPermission === 'denied' ? (
                                    <span className="text-xs text-destructive/70 font-medium">
                                        {t.notificationsBlocked}
                                    </span>
                                ) : (
                                    <>
                                        <button
                                            onClick={handleToggleNotifications}
                                            className={cn(
                                                "relative w-12 h-7 rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary/30",
                                                notifEnabled
                                                    ? "bg-orange-500"
                                                    : "bg-muted"
                                            )}
                                            role="switch"
                                            aria-checked={notifEnabled}
                                            title={notifEnabled ? t.notificationsEnabled : t.notificationsDisabled}
                                        >
                                            <span
                                                className={cn(
                                                    "absolute top-0.5 w-6 h-6 rounded-full bg-white shadow-md transition-transform duration-300",
                                                    notifEnabled
                                                        ? "translate-x-[22px]"
                                                        : "translate-x-0.5"
                                                )}
                                            />
                                        </button>
                                        <span className={cn(
                                            "text-xs font-semibold",
                                            notifEnabled ? "text-orange-500" : "text-muted-foreground"
                                        )}>
                                            {notifEnabled ? t.notificationsEnabled : t.notificationsDisabled}
                                        </span>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* ── Account Info ── */}
                    <div className="p-4 sm:p-5 bg-card/40 rounded-2xl border border-border">
                        <p className="font-bold text-foreground mb-3 sm:mb-4 text-sm">{t.account}</p>

                        {/* Stats Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <div className="bg-primary/5 dark:bg-primary/10 rounded-xl p-3 text-center border border-primary/10">
                                <Target className="w-5 h-5 text-primary mx-auto mb-1.5" />
                                <p className="text-2xl font-black text-foreground">{goals.length}</p>
                                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{t.goalsCreated}</p>
                            </div>
                            <div className="bg-emerald-500/5 dark:bg-emerald-500/10 rounded-xl p-3 text-center border border-emerald-500/10">
                                <Check className="w-5 h-5 text-emerald-500 mx-auto mb-1.5" />
                                <p className="text-2xl font-black text-foreground">{completedGoals}</p>
                                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{t.completedGoals}</p>
                            </div>
                            <div className="bg-blue-500/5 dark:bg-blue-500/10 rounded-xl p-3 text-center border border-blue-500/10">
                                <Sparkles className="w-5 h-5 text-blue-500 mx-auto mb-1.5" />
                                <p className="text-2xl font-black text-foreground">{totalPointsEarned.toLocaleString()}</p>
                                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{t.totalPointsEarned}</p>
                            </div>
                            <div className="bg-purple-500/5 dark:bg-purple-500/10 rounded-xl p-3 text-center border border-purple-500/10">
                                <BarChart2 className="w-5 h-5 text-purple-500 mx-auto mb-1.5" />
                                <p className="text-2xl font-black text-foreground">{totalLogs}</p>
                                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{t.totalLogsRecorded}</p>
                            </div>
                        </div>

                        {/* Status Row */}
                        <div className="mt-4 flex items-center justify-between text-sm px-1">
                            <span className="text-muted-foreground">{t.status}</span>
                            <span className="font-semibold text-emerald-500 flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                {t.active}
                            </span>
                        </div>
                    </div>

                    {/* ── Sign Out ── */}
                    <button
                        onClick={handleSignOut}
                        disabled={signingOut}
                        className={cn(
                            "w-full flex items-center justify-center gap-2.5 p-4 rounded-2xl border transition-all duration-200 font-semibold text-sm group",
                            signingOut
                                ? "bg-muted/30 border-border text-muted-foreground cursor-not-allowed"
                                : "bg-card/40 border-border text-muted-foreground hover:bg-destructive/5 hover:border-destructive/30 hover:text-destructive"
                        )}
                    >
                        <LogOut className={cn(
                            "w-4 h-4 transition-transform duration-200",
                            !signingOut && "group-hover:-translate-x-0.5"
                        )} />
                        {signingOut ? t.signingOut : t.signOut}
                    </button>
                </div>
            </div>
        </div>
    );
}
