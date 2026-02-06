'use client';

import { Flame } from 'lucide-react';
import { translations, type Language } from '@/lib/translations';

interface StreakFlameProps {
    currentStreak: number;
    language?: Language;
}

export default function StreakFlame({ currentStreak, language = 'en' }: StreakFlameProps) {
    const t = translations[language];
    // Determine flame intensity based on streak
    const getFlameColor = (streak: number) => {
        if (streak === 0) return 'text-muted-foreground/30';
        if (streak < 3) return 'text-chart-5 dark:text-chart-3'; // Warm up (Orange)
        if (streak < 7) return 'text-destructive'; // Hot
        if (streak < 30) return 'text-destructive'; // Very Hot
        return 'text-chart-1'; // Epic streak (Purple/Primary)
    };

    const getFlameSize = (streak: number) => {
        if (streak === 0) return 'w-5 h-5';
        if (streak < 3) return 'w-6 h-6';
        return 'w-8 h-8';
    };

    return (
        <div className="bg-card/50 px-4 py-3 rounded-3xl border border-border shadow-lg flex items-center gap-3 hover:bg-card/80 transition-all">
            <div className={`p-2.5 rounded-2xl ${currentStreak > 0 ? 'bg-chart-5/10 ring-1 ring-chart-5/20 dark:bg-chart-3/10 dark:ring-chart-3/20' : 'bg-muted/50'} relative overflow-hidden`}>
                <Flame className={`${getFlameSize(currentStreak)} ${getFlameColor(currentStreak)} ${currentStreak > 0 ? 'animate-pulse' : ''}`} />
                {currentStreak > 7 && (
                    <div className="absolute inset-0 bg-gradient-to-t from-chart-5/20 to-transparent dark:from-chart-3/20 pointer-events-none"></div>
                )}
            </div>
            <div>
                <p className="text-xl font-bold text-foreground leading-tight">{currentStreak}</p>
                <p className="text-[10px] text-muted-foreground font-bold uppercase">{t.dayStreak}</p>
            </div>
        </div>
    );
}
