'use client';

import { Flame } from 'lucide-react';
import { translations, type Language } from '@/lib/translations';

interface StreakFlameProps {
    currentStreak: number;
    language?: Language;
}

export default function StreakFlame({ currentStreak, language = 'en' }: StreakFlameProps) {
    const t = translations[language];

    const getFlameColor = (streak: number) => {
        if (streak === 0) return 'text-muted-foreground/30';
        if (streak < 3) return 'text-chart-5 dark:text-chart-3';
        if (streak < 7) return 'text-destructive';
        if (streak < 30) return 'text-destructive';
        return 'text-chart-1';
    };

    return (
        <div className="flex-1 bg-card/40 px-2 sm:px-4 py-2 sm:py-4 rounded-xl sm:rounded-2xl border border-border flex items-center gap-2 sm:gap-3 hover:bg-card/60 transition-all h-full">
            <div className={`p-1.5 sm:p-2.5 rounded-lg sm:rounded-xl ${currentStreak > 0 ? 'bg-chart-5/10 dark:bg-chart-3/10' : 'bg-muted/50'} relative overflow-hidden`}>
                <Flame className={`w-4 h-4 sm:w-5 sm:h-5 ${getFlameColor(currentStreak)} ${currentStreak > 0 ? 'animate-pulse' : ''}`} />
            </div>
            <div className="min-w-0">
                <p className="text-sm sm:text-xl font-black text-foreground leading-none">{currentStreak}</p>
                <p className="text-[8px] sm:text-[10px] text-muted-foreground font-bold uppercase mt-0.5 sm:mt-1">{t.dayStreak}</p>
            </div>
        </div>
    );
}
