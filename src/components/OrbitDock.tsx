'use client';

import * as React from 'react';
import { Home, User, Target } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getIconComponent } from './IconPicker';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { translations, type Language } from '@/lib/translations';

interface DockItemProps {
    icon: React.ElementType;
    label: string;
    isActive?: boolean;
    onClick: () => void;
}

const DockItem = ({ icon: Icon, label, isActive, onClick }: DockItemProps) => {
    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <button
                        onClick={onClick}
                        className={cn(
                              "relative flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl transition-all duration-300 ease-out group sm:h-12 sm:w-12 sm:rounded-2xl",
                              isActive
                                  ? "h-11 w-11 bg-primary text-primary-foreground shadow-lg shadow-primary/30 scale-105 -translate-y-1 sm:scale-110 sm:-translate-y-2"
                                  : "h-11 w-11 bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground hover:scale-105 hover:-translate-y-1"
                        )}
                    >
                        <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                        {isActive && (
                            <span className="absolute -bottom-2 w-1 h-1 bg-primary-foreground rounded-full opacity-50" />
                        )}
                    </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="bg-popover text-popover-foreground border-border shadow-md">
                    <p>{label}</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
};

interface OrbitDockProps {
    goals?: DockGoal[];
    selectedGoalId?: string | null;
    onSelectGoal?: (id: string | null) => void;
    activeTab?: string;
    onTabChange?: (tab: string) => void;
    language?: Language;
}

interface DockGoal {
    id: string;
    title: string;
    icon?: string;
    is_pinned?: boolean;
}

export default function OrbitDock({
    goals = [],
    selectedGoalId,
    onSelectGoal,
    activeTab = 'home',
    onTabChange,
    language = 'en'
}: OrbitDockProps) {
    const t = translations[language];
    const pinnedGoals = goals.filter(g => g.is_pinned).slice(0, 2);

    const handleTabChange = (tab: string) => {
        if (onTabChange) onTabChange(tab);
    };

    return (
        <div className="fixed bottom-[calc(0.75rem+env(safe-area-inset-bottom))] left-1/2 z-50 flex w-full max-w-[calc(100vw-1rem)] -translate-x-1/2 justify-center px-2 transition-all duration-500 pointer-events-none sm:bottom-6 sm:max-w-max sm:px-0 lg:bottom-auto lg:top-1/2 lg:left-6 lg:w-auto lg:max-w-none lg:-translate-x-0 lg:-translate-y-1/2 rtl:lg:left-auto rtl:lg:right-6 rtl:lg:translate-x-0">
            {/* DOCK BAR */}
            <div className="flex items-center gap-1.5 overflow-x-auto rounded-full border border-border/60 bg-background/88 px-2 py-2 shadow-2xl ring-1 ring-black/5 backdrop-blur-2xl transition-all duration-500 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden pointer-events-auto max-w-full dark:ring-white/10 sm:gap-3 sm:px-4 sm:py-3 lg:max-h-[calc(100dvh-4rem)] lg:flex-col lg:overflow-x-hidden lg:overflow-y-auto lg:px-3 lg:py-4">
                <DockItem
                    icon={Home}
                    label={language === 'ar' ? 'الرئيسية' : 'Home'}
                    isActive={activeTab === 'home'}
                    onClick={() => handleTabChange('home')}
                />

                <DockItem
                    icon={Target}
                    label={t.myGoals}
                    isActive={activeTab === 'goals'}
                    onClick={() => handleTabChange('goals')}
                />

                <div className="w-px h-6 sm:h-8 lg:w-8 lg:h-px bg-border/60 mx-0.5 sm:mx-1 lg:mx-0 lg:my-1 shrink-0" />

                {/* PINNED GOALS */}
                <div className="flex lg:flex-col items-center gap-2 sm:gap-3 shrink-0">
                    {pinnedGoals.map(goal => {
                        const GoalIcon = getIconComponent(goal.icon || 'Target');
                        return (
                            <DockItem
                                key={goal.id}
                                icon={GoalIcon}
                                label={goal.title}
                                isActive={activeTab === 'dashboard' && selectedGoalId === goal.id}
                                onClick={() => {
                                    if (onSelectGoal) onSelectGoal(goal.id);
                                    handleTabChange('dashboard');
                                }}
                            />
                        );
                    })}
                </div>

                {goals.some(g => g.is_pinned) && (
                    <div className="w-px h-6 sm:h-8 lg:w-8 lg:h-px bg-border/60 mx-0.5 sm:mx-1 lg:mx-0 lg:my-1 shrink-0" />
                )}

                <DockItem
                    icon={User}
                    label={t.orbitSettings}
                    isActive={activeTab === 'settings'}
                    onClick={() => handleTabChange('settings')}
                />
            </div>
        </div>
    );
}
