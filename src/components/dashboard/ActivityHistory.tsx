'use client';

import { useState } from 'react';
import { Calendar, Star, MessageSquare, Clock, MoreVertical, Eye, Trash2, EyeOff, Plus } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { translations, type Language } from '@/lib/translations';
import { getDailyPerformanceLabel, parseDailyLogBreakdown } from '@/lib/daily-log-feedback';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import ConfirmModal from '../shared/ConfirmModal';

interface Log {
    id: string;
    created_at: string;
    user_input: string;
    ai_score: number | null;
    ai_feedback: string;
    breakdown: unknown;
}

interface ActivityHistoryProps {
    logs: Log[];
    language?: Language;
    onLogDeleted?: () => void;
    onLogProgress?: () => void;
    embedded?: boolean;
}

export default function ActivityHistory({ logs, language = 'en', onLogDeleted, onLogProgress, embedded = false }: ActivityHistoryProps) {
    const t = translations[language];
    const isArabic = language === 'ar';
    const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
    const [confirmDeleteLogId, setConfirmDeleteLogId] = useState<string | null>(null);
    const supabase = createClient();

    const handleDeleteLog = async (logId: string) => {
        try {
            const { error } = await supabase
                .from('daily_logs')
                .delete()
                .eq('id', logId);

            if (error) throw error;

            if (onLogDeleted) {
                onLogDeleted();
            }
        } catch (error) {
            console.error('Error deleting log:', error);
        } finally {
            setConfirmDeleteLogId(null);
        }
    };
    if (logs.length === 0) {
        return (
            <div className={embedded ? "h-full" : "bg-card/30 backdrop-blur-xl p-4 sm:p-8 rounded-[20px] sm:rounded-[32px] shadow-2xl border border-border"}>
                <div className={embedded ? "text-center p-8 bg-muted/20 rounded-2xl border border-dashed border-border h-full flex flex-col items-center justify-center" : "text-center p-8 bg-muted/20 rounded-2xl border border-dashed border-border"}>
                    <Clock className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground font-medium">{t.noActivityYet}</p>
                </div>
            </div>
        );
    }

    const isRTL = (text: string) => {
        const arabicRegex = /[\u0600-\u06ff]/;
        return arabicRegex.test(text);
    };

    return (
        <div
            className={embedded ? "h-full min-h-0 flex flex-col overflow-hidden" : "bg-card/40 backdrop-blur-xl p-4 sm:p-6 rounded-[20px] sm:rounded-[32px] shadow-2xl border border-border/80 relative overflow-hidden ring-1 ring-border/10 flex flex-col h-full min-h-[280px] max-h-[56vh]"}
            dir={isArabic ? 'rtl' : 'ltr'}
        >
            {!embedded && <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />}

            <div className="shrink-0 px-1 sm:px-1.5 pb-2 sm:pb-3">
                <div className="flex items-center justify-between gap-2 sm:gap-3 h-11 sm:h-12 rounded-xl border border-border/60 bg-background/50 px-2.5 sm:px-3">
                    <h3 className={isArabic ? "text-base sm:text-lg font-semibold text-foreground flex items-center gap-2 truncate min-w-0 text-right" : "text-base sm:text-lg font-semibold text-foreground flex items-center gap-2 truncate min-w-0"}>
                        <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-chart-3 shrink-0" />
                        <span className="truncate">{t.activityHistory}</span>
                    </h3>
                    <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                        <div className="text-[11px] sm:text-xs text-muted-foreground font-medium">
                            {logs.length} {logs.length === 1 ? t.entry : t.entries}
                        </div>
                        {embedded && onLogProgress && (
                            <button
                                onClick={onLogProgress}
                                aria-label={t.logProgressButton}
                                className="h-7 w-7 sm:h-8 sm:w-8 shrink-0 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 flex items-center justify-center transition-all hover:shadow-md"
                            >
                                <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <div
                className={embedded
                    ? "flex-1 min-h-0 overflow-y-auto px-1 sm:px-1.5 pb-2 sm:pb-3 space-y-2.5 sm:space-y-3 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-muted/20 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-muted/50 transition-colors"
                    : "flex-1 min-h-0 overflow-y-auto px-1 sm:px-1.5 pb-3 sm:pb-4 space-y-2.5 sm:space-y-3 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-muted/20 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-muted/50 transition-colors"
                }
            >

                
                {logs.map((log) => {
                    const userInputRTL = isRTL(log.user_input);
                    const feedbackRTL = log.ai_feedback ? isRTL(log.ai_feedback) : false;
                    const isExpanded = expandedLogId === log.id;
                    const performanceMeta = parseDailyLogBreakdown(log.breakdown).meta;
                    const performanceLabel = getDailyPerformanceLabel(performanceMeta, language);
                    const performanceBadgeClass = performanceMeta?.performance_tier === 'exceptional'
                        ? 'bg-chart-5/12 text-chart-5 ring-chart-5/20 dark:bg-chart-3/12 dark:text-chart-3 dark:ring-chart-3/20'
                        : performanceMeta?.performance_tier === 'strong'
                            ? 'bg-chart-2/12 text-chart-2 ring-chart-2/20'
                            : performanceMeta?.performance_tier === 'weak'
                                ? 'bg-destructive/10 text-destructive ring-destructive/20'
                                : 'bg-amber-500/10 text-amber-700 ring-amber-500/20 dark:text-amber-300';
                    const cardToneClass = performanceMeta?.warning_level === 'high'
                        ? 'hover:border-destructive/30'
                        : performanceMeta?.badge !== 'none'
                            ? 'hover:border-chart-3/40'
                            : 'hover:border-chart-3/30';

                    return (
                        <div key={log.id} className={`bg-card/60 backdrop-blur-sm p-3 sm:p-4 rounded-2xl border border-border/80 shadow-sm hover:shadow-lg hover:bg-card/80 transition-all group ${cardToneClass}`}>
                            {/* First Row: Date/Time, Points, Menu Button */}
                            <div className="flex items-center justify-between gap-3 mb-2.5">
                                <div className="flex items-center gap-2 min-w-0">
                                    <Calendar className="w-3 h-3 text-muted-foreground" />
                                    <span className="text-xs text-muted-foreground whitespace-nowrap">{new Date(log.created_at).toLocaleDateString(isArabic ? 'ar-SA' : 'en-US', { month: 'short', day: 'numeric' })}</span>
                                    <span className="text-muted-foreground/40 text-xs">•</span>
                                    <span className="text-xs text-muted-foreground whitespace-nowrap">{new Date(log.created_at).toLocaleTimeString(isArabic ? 'ar-SA' : 'en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    {performanceLabel && (
                                        <div className={`hidden sm:inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-[0.14em] ring-1 ${performanceBadgeClass}`}>
                                            <span>{performanceLabel}</span>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-1 bg-chart-2/10 text-chart-2 px-2 py-1 rounded-lg text-xs font-bold ring-1 ring-chart-2/20">
                                        <Star className="w-3 h-3 fill-current" />
                                        <span>+{log.ai_score ?? 0}</span>
                                    </div>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <button className="p-1.5 hover:bg-muted rounded-lg transition-colors text-muted-foreground hover:text-foreground">
                                                <MoreVertical className="w-4 h-4" />
                                            </button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-48">
                                            <DropdownMenuItem onClick={() => setExpandedLogId(isExpanded ? null : log.id)}>
                                                {isExpanded ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                {isExpanded ? t.hideDetails : t.viewDetails}
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem variant="destructive" onClick={() => setConfirmDeleteLogId(log.id)}>
                                                <Trash2 className="w-4 h-4" />
                                                {t.deleteTask}
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </div>

                            {performanceLabel && (
                                <div className={`mb-2 inline-flex sm:hidden items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-[0.14em] ring-1 ${performanceBadgeClass}`}>
                                    <span>{performanceLabel}</span>
                                </div>
                            )}

                            {/* Second Row: Activity Text */}
                            <p
                                className={`text-foreground font-semibold text-sm leading-relaxed whitespace-pre-wrap ${isExpanded ? '' : 'line-clamp-3'}`}
                                dir={userInputRTL ? 'rtl' : 'ltr'}
                                style={{ textAlign: userInputRTL ? 'right' : 'left' }}
                            >
                                {log.user_input}
                            </p>

                            {/* AI Feedback (when expanded) */}
                            {isExpanded && log.ai_feedback && (
                                <div className="mt-3 pt-3 border-t border-border animate-in fade-in slide-in-from-top-2 duration-200">
                                    <div className="bg-chart-1/5 p-3 rounded-xl flex gap-2 text-xs text-chart-1 items-start border border-chart-1/20">
                                        <MessageSquare className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                                        <p
                                            className="italic flex-1 leading-relaxed"
                                            dir={feedbackRTL ? 'rtl' : 'ltr'}
                                            style={{ textAlign: feedbackRTL ? 'right' : 'left' }}
                                        >
                                            &quot;{log.ai_feedback}&quot;
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            <ConfirmModal
                isOpen={Boolean(confirmDeleteLogId)}
                title={isArabic ? 'حذف السجل' : 'Delete Log'}
                message={isArabic ? 'هل أنت متأكد من حذف هذا السجل؟ لا يمكن التراجع عن هذا الإجراء.' : 'Are you sure you want to delete this log? This cannot be undone.'}
                onConfirm={() => {
                    if (confirmDeleteLogId) {
                        handleDeleteLog(confirmDeleteLogId);
                    }
                }}
                onCancel={() => setConfirmDeleteLogId(null)}
                language={language}
            />
        </div>
    );
}
