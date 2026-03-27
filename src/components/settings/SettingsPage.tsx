'use client';

import { MatrixManifestoDialog } from '@/components/login/MatrixManifestoDialog';
import { useState, useEffect, useRef } from 'react';
import {
    Sun, Moon, Globe, Target, Bell, BellOff, Flame, Crown, LogOut, User, Camera, Trash2, ScrollText
} from 'lucide-react';
import { translations, type Language } from '@/lib/translations';
import { createClient } from '@/utils/supabase/client';
import { cn } from '@/lib/utils';
import { isNotificationsEnabled, setNotificationsEnabled, getNotificationPermission } from '@/hooks/useStreakReminder';
import type { User as SupabaseUser } from '@supabase/supabase-js';

interface Goal {
    id: string;
    title: string;
    current_points: number;
    target_points: number;
    status: string;
    created_at: string;
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

    return (
        <div
            className="w-full max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-500"
            dir={isArabic ? 'rtl' : 'ltr'}
        >
            <MatrixManifestoDialog
                open={isManifestoOpen}
                onOpenChange={setIsManifestoOpen}
            />

            <div className="bg-card/30 backdrop-blur-xl p-4 sm:p-6 rounded-[24px] sm:rounded-[32px] border border-border ring-1 ring-border/5 shadow-2xl">
                {/* Tabs */}
                <div className="flex gap-2 mb-6 border-b border-border/50 pb-4">
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
                        <div className="p-4 sm:p-5 flex flex-row items-center justify-between gap-4 border-b border-border/50 hover:bg-muted/10 transition-colors">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                <div className="shrink-0 w-9 h-9 rounded-xl bg-amber-500/10 dark:bg-indigo-500/10 flex items-center justify-center">
                                    {theme === 'dark' ? <Moon className="w-4 h-4 text-indigo-500" /> : <Sun className="w-4 h-4 text-amber-500" />}
                                </div>
                                <div className="min-w-0">
                                    <p className="font-bold text-foreground text-sm">{t.appearance}</p>
                                    <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5 truncate">{t.appearanceDesc}</p>
                                </div>
                            </div>
                            <div className="flex gap-1.5 shrink-0 bg-muted/30 p-1 rounded-xl">
                                <button
                                    onClick={() => handleThemeChange('light')}
                                    className={cn(
                                        "flex items-center justify-center w-8 h-8 sm:w-auto sm:px-3 sm:py-1.5 rounded-lg text-xs font-semibold transition-all duration-200",
                                        theme === 'light' ? "bg-background text-amber-600 shadow-sm ring-1 ring-border" : "text-muted-foreground hover:text-foreground"
                                    )}
                                    title={t.lightMode}
                                >
                                    <Sun className="w-4 h-4 sm:w-3.5 sm:h-3.5 sm:mr-1.5 rtl:sm:ml-1.5 rtl:sm:mr-0" />
                                    <span className="hidden sm:inline">{t.lightMode}</span>
                                </button>
                                <button
                                    onClick={() => handleThemeChange('dark')}
                                    className={cn(
                                        "flex items-center justify-center w-8 h-8 sm:w-auto sm:px-3 sm:py-1.5 rounded-lg text-xs font-semibold transition-all duration-200",
                                        theme === 'dark' ? "bg-background text-indigo-500 shadow-sm ring-1 ring-border" : "text-muted-foreground hover:text-foreground"
                                    )}
                                    title={t.darkMode}
                                >
                                    <Moon className="w-4 h-4 sm:w-3.5 sm:h-3.5 sm:mr-1.5 rtl:sm:ml-1.5 rtl:sm:mr-0" />
                                    <span className="hidden sm:inline">{t.darkMode}</span>
                                </button>
                            </div>
                        </div>

                        <div className="p-4 sm:p-5 flex flex-row items-center justify-between gap-4 border-b border-border/50 hover:bg-muted/10 transition-colors">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                <div className="shrink-0 w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center">
                                    <Globe className="w-4 h-4 text-blue-500" />
                                </div>
                                <div className="min-w-0">
                                    <p className="font-bold text-foreground text-sm">{t.language}</p>
                                    <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5 truncate">{t.languageDesc}</p>
                                </div>
                            </div>
                            <div className="flex gap-1.5 shrink-0 bg-muted/30 p-1 rounded-xl">
                                <button
                                    onClick={() => handleLanguageChange('en')}
                                    className={cn(
                                        "flex items-center justify-center w-8 h-8 sm:w-auto sm:px-3 sm:py-1.5 rounded-lg text-xs font-semibold transition-all duration-200",
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
                                        "flex items-center justify-center w-8 h-8 sm:w-auto sm:px-3 sm:py-1.5 rounded-lg text-xs font-semibold transition-all duration-200",
                                        language === 'ar' ? "bg-background text-foreground shadow-sm ring-1 ring-border" : "text-muted-foreground hover:text-foreground"
                                    )}
                                    title={t.arabic}
                                >
                                    <span className="sm:hidden font-bold">AR</span>
                                    <span className="hidden sm:inline">{t.arabic}</span>
                                </button>
                            </div>
                        </div>

                        <div className="p-4 sm:p-5 flex flex-row items-center justify-between gap-4 hover:bg-muted/10 transition-colors">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                <div className={cn("shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-colors", notifEnabled ? "bg-orange-500/10" : "bg-muted/50")}>
                                    {notifEnabled ? <Bell className="w-4 h-4 text-orange-500" /> : <BellOff className="w-4 h-4 text-muted-foreground" />}
                                </div>
                                <div className="min-w-0">
                                    <p className="font-bold text-foreground text-sm">{t.notifications}</p>
                                    <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5 truncate">{t.notificationsDesc}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                {notifPermission === 'unsupported' ? (
                                    <span className="text-[10px] sm:text-xs text-muted-foreground/60 font-medium bg-muted/30 px-2 py-1 rounded-md">{t.notificationsUnsupported}</span>
                                ) : notifPermission === 'denied' ? (
                                    <span className="text-[10px] sm:text-xs text-destructive/70 font-medium bg-destructive/10 px-2 py-1 rounded-md">{t.notificationsBlocked}</span>
                                ) : (
                                    <button
                                        onClick={handleToggleNotifications}
                                        className={cn(
                                            "relative w-11 h-6 rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary/30",
                                            notifEnabled ? "bg-orange-500" : "bg-muted-foreground/40"
                                        )}
                                        role="switch"
                                        aria-checked={notifEnabled}
                                        title={notifEnabled ? t.notificationsEnabled : t.notificationsDisabled}
                                    >
                                        <span className={cn(
                                            "absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-all duration-300",
                                            notifEnabled ? "ltr:left-[calc(100%-22px)] rtl:right-[calc(100%-22px)]" : "ltr:left-0.5 rtl:right-0.5"
                                        )} />
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="border-t border-border/50 bg-gradient-to-r from-background/10 via-muted/10 to-background/10 p-4 sm:p-5">
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                <div className="flex items-start gap-3 flex-1 min-w-0">
                                    <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-slate-950/[0.04] dark:border-white/10 dark:bg-white/6">
                                        <ScrollText className="h-4 w-4 text-slate-700 dark:text-slate-200" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="font-bold text-foreground text-sm">{t.matrixStory}</p>
                                        <p className="mt-1 text-[11px] leading-5 text-muted-foreground sm:text-xs sm:leading-6">
                                            {t.matrixStoryDesc}
                                        </p>
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => setIsManifestoOpen(true)}
                                    className="w-full sm:w-auto min-h-11 shrink-0 rounded-xl border border-border bg-background/80 px-4 py-2.5 text-sm font-semibold text-foreground shadow-sm transition-all duration-200 hover:bg-background hover:shadow-md"
                                >
                                    {t.readStory}
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* Profile section */}
                        <div className="bg-card/40 rounded-2xl border border-border p-4 sm:p-6 space-y-6">
                            {profileMessage && (
                                <div className={cn(
                                    "text-sm font-medium px-4 py-2 rounded-xl",
                                    profileMessage.type === 'success' ? "bg-emerald-500/10 text-emerald-600" : "bg-destructive/10 text-destructive"
                                )}>
                                    {profileMessage.text}
                                </div>
                            )}

                            {/* Profile Picture */}
                            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                                <div className="relative group shrink-0">
                                    <div className="w-24 h-24 rounded-full overflow-hidden bg-muted/50 border-2 border-border flex items-center justify-center">
                                        {avatarUrl ? (
                                            <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="text-3xl font-black text-muted-foreground">
                                                {displayName?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
                                            </span>
                                        )}
                                    </div>
                                    <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
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
                                            className="p-2 rounded-full bg-background/80 hover:bg-background transition-colors"
                                            title={t.changePhoto}
                                        >
                                            <Camera className="w-4 h-4" />
                                        </button>
                                        {avatarUrl && (
                                            <button
                                                onClick={handleRemovePhoto}
                                                disabled={updatingProfile}
                                                className="p-2 rounded-full bg-destructive/80 hover:bg-destructive text-white transition-colors"
                                                title={t.removePhoto}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-bold text-foreground text-sm">{t.profilePicture}</p>
                                    <p className="text-xs text-muted-foreground mt-0.5">{t.profilePictureDesc}</p>
                                    <div className="mt-2 flex flex-wrap gap-2">
                                        <button
                                            onClick={() => fileInputRef.current?.click()}
                                            disabled={updatingProfile}
                                            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                                        >
                                            {updatingProfile ? '...' : t.changePhoto}
                                        </button>
                                        {avatarUrl && (
                                            <button
                                                onClick={handleRemovePhoto}
                                                disabled={updatingProfile}
                                                className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
                                            >
                                                {t.removePhoto}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Display Name */}
                            <div>
                                <label className="block font-bold text-foreground text-sm mb-1">{t.displayName}</label>
                                <p className="text-xs text-muted-foreground mb-2">{t.displayNameDesc}</p>
                                <div className="flex flex-col sm:flex-row gap-2">
                                    <input
                                        type="text"
                                        value={displayName}
                                        onChange={(e) => setDisplayName(e.target.value)}
                                        placeholder={user?.email?.split('@')[0] || ''}
                                        className="flex-1 px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                                    />
                                    <button
                                        onClick={handleDisplayNameSave}
                                        disabled={updatingProfile}
                                        className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                                    >
                                        {updatingProfile ? '...' : t.saveChanges}
                                    </button>
                                </div>
                            </div>

                            {/* Email (read-only) */}
                            <div>
                                <label className="block font-bold text-foreground text-sm mb-1">{t.emailAddress}</label>
                                <p className="text-xs text-muted-foreground mb-2">{t.emailDesc}</p>
                                <div className="px-4 py-2.5 rounded-xl border border-border bg-muted/20 text-muted-foreground text-sm">
                                    {user?.email || '—'}
                                </div>
                            </div>

                            {/* Account Stats */}
                            <div className="pt-4 border-t border-border">
                                <p className="font-bold text-foreground text-sm mb-3 flex items-center gap-2">
                                    <Target className="w-4 h-4 text-primary" />
                                    {t.account}
                                </p>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                                    <div className="bg-muted/30 rounded-xl p-3 text-center border border-border/50">
                                        <p className="text-lg sm:text-xl font-black text-foreground">{goals.length}</p>
                                        <p className={cn("text-[10px] leading-tight font-semibold text-muted-foreground", !isArabic && "uppercase")}>{t.goalsCreated}</p>
                                    </div>
                                    <div className="bg-muted/30 rounded-xl p-3 text-center border border-border/50">
                                        <p className="text-lg sm:text-xl font-black text-foreground">{completedGoals}</p>
                                        <p className={cn("text-[10px] leading-tight font-semibold text-muted-foreground", !isArabic && "uppercase")}>{t.completedGoals}</p>
                                    </div>
                                    <div className="bg-muted/30 rounded-xl p-3 text-center border border-border/50">
                                        <p className="text-lg sm:text-xl font-black text-foreground">{totalPointsEarned >= 1000 ? (totalPointsEarned / 1000).toFixed(1) + 'k' : totalPointsEarned}</p>
                                        <p className={cn("text-[10px] leading-tight font-semibold text-muted-foreground", !isArabic && "uppercase")}>{t.totalPointsEarned}</p>
                                    </div>
                                    <div className="bg-muted/30 rounded-xl p-3 text-center border border-border/50">
                                        <p className="text-lg sm:text-xl font-black text-foreground">{totalLogs}</p>
                                        <p className={cn("text-[10px] leading-tight font-semibold text-muted-foreground", !isArabic && "uppercase")}>{t.totalLogsRecorded}</p>
                                    </div>
                                </div>
                                <div className="flex gap-1.5 mt-3">
                                    {maxStreak >= 7 && (
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center shadow-lg ring-2 ring-background" title={isArabic ? "شعلة المواظبة: 7 أيام" : "Consistency Flame: 7 Days"}>
                                            <Flame className="w-4 h-4 text-white" />
                                        </div>
                                    )}
                                    {maxStreak >= 30 && (
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-300 to-amber-500 flex items-center justify-center shadow-lg ring-2 ring-background" title={isArabic ? "تاج الالتزام: 30 يوماً" : "Crown of Commitment: 30 Days"}>
                                            <Crown className="w-4 h-4 text-white" />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Sign Out */}
                        <button
                            onClick={handleSignOut}
                            disabled={signingOut}
                            className={cn(
                                "w-full flex items-center justify-center gap-2 p-3.5 rounded-2xl border transition-all duration-200 font-bold text-sm shrink-0",
                                signingOut
                                    ? "bg-muted/30 border-border text-muted-foreground cursor-not-allowed"
                                    : "bg-destructive/5 border-destructive/20 text-destructive hover:bg-destructive hover:text-destructive-foreground hover:border-destructive"
                            )}
                        >
                            {signingOut ? (
                                <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <LogOut className="w-4 h-4" />
                            )}
                            {signingOut ? t.signingOut : t.signOut}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
