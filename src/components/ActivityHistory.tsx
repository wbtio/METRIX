'use client';

import { useState } from 'react';
import { Calendar, Star, MessageSquare, Clock, MoreVertical, Eye, Trash2, EyeOff } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { translations, type Language } from '@/lib/translations';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

interface Log {
    id: string;
    created_at: string;
    user_input: string;
    ai_score: number;
    ai_feedback: string;
}

interface ActivityHistoryProps {
    logs: Log[];
    language?: Language;
    onLogDeleted?: () => void;
    embedded?: boolean;
}

export default function ActivityHistory({ logs, language = 'en', onLogDeleted, embedded = false }: ActivityHistoryProps) {
    const t = translations[language];
    const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
    const supabase = createClient();

    const handleDeleteLog = async (logId: string) => {
        if (!confirm(language === 'ar' ? 'هل أنت متأكد من حذف هذا السجل؟' : 'Are you sure you want to delete this log?')) return;
        
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
            alert(language === 'ar' ? 'حدث خطأ أثناء حذف السجل' : 'Error deleting log');
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
        <div className={embedded ? "h-full min-h-0 flex flex-col overflow-hidden" : "bg-card/40 backdrop-blur-xl p-4 sm:p-6 rounded-[20px] sm:rounded-[32px] shadow-2xl border border-border/80 relative overflow-hidden ring-1 ring-border/10 space-y-3 sm:space-y-4 h-full min-h-[320px]"}>
            {!embedded && <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />}

            <div className={embedded ? "flex items-center justify-between shrink-0 mb-3" : "flex items-center justify-between"}>
                <h3 className="text-lg sm:text-xl font-bold text-foreground flex items-center gap-2">
                    <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-chart-3" /> {t.activityHistory}
                </h3>
                <div className="text-xs text-muted-foreground font-medium">
                    {logs.length} {logs.length === 1 ? t.entry : t.entries}
                </div>
            </div>

            <div
                className={embedded
                    ? "flex-1 min-h-0 overflow-y-auto space-y-3 pr-1 pl-1 pb-2 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-muted/20 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-muted/50 transition-colors"
                    : "space-y-3 max-h-[420px] sm:max-h-[460px] overflow-y-auto pr-3 pl-1 pb-4 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-muted/20 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-muted/50 transition-colors"
                }
            >

                
                {logs.map((log) => {
                    const userInputRTL = isRTL(log.user_input);
                    const feedbackRTL = log.ai_feedback ? isRTL(log.ai_feedback) : false;
                    const isExpanded = expandedLogId === log.id;

                    return (
                        <div key={log.id} className="bg-card/60 backdrop-blur-sm p-4 rounded-2xl border border-border/80 shadow-sm hover:shadow-lg hover:border-chart-3/30 hover:bg-card/80 transition-all group">
                            {/* First Row: Date/Time, Points, Menu Button */}
                            <div className="flex items-center justify-between gap-3 mb-2">
                                <div className="flex items-center gap-2">
                                    <Calendar className="w-3 h-3 text-muted-foreground" />
                                    <span className="text-xs text-muted-foreground">{new Date(log.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                                    <span className="text-muted-foreground/40 text-xs">•</span>
                                    <span className="text-xs text-muted-foreground">{new Date(log.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <div className="flex items-center gap-1 bg-chart-2/10 text-chart-2 px-2 py-1 rounded-lg text-xs font-bold ring-1 ring-chart-2/20">
                                        <Star className="w-3 h-3 fill-current" />
                                        <span>+{log.ai_score}</span>
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
                                            <DropdownMenuItem variant="destructive" onClick={() => handleDeleteLog(log.id)}>
                                                <Trash2 className="w-4 h-4" />
                                                {t.deleteTask}
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </div>

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
        </div>
    );
}