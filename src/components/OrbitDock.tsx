'use client';

import * as React from 'react';
import { Home, Settings, Target } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getIconComponent } from './goal/IconPicker';
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
                        aria-label={label}
                        className={cn(
                              "group relative flex h-10 w-10 shrink-0 items-center justify-center rounded-[1.15rem] transition-all duration-300 ease-out sm:h-11 sm:w-11 sm:rounded-[1.25rem]",
                              isActive
                                  ? "bg-primary/[0.12] text-primary shadow-[0_10px_24px_-16px_hsl(var(--primary)/0.8)] ring-1 ring-primary/25"
                                  : "bg-background/55 text-muted-foreground shadow-sm ring-1 ring-border/40 hover:-translate-y-0.5 hover:bg-muted/80 hover:text-foreground"
                        )}
                    >
                        <Icon className="h-4 w-4 sm:h-[18px] sm:w-[18px]" />
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
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex h-[calc(5rem+env(safe-area-inset-bottom))] w-full items-end justify-center px-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] transition-all duration-500 sm:h-24 lg:inset-x-auto lg:bottom-auto lg:left-6 lg:top-1/2 lg:h-auto lg:w-auto lg:max-w-none lg:-translate-y-1/2 lg:px-0 lg:pb-0 rtl:lg:left-auto rtl:lg:right-6 rtl:lg:translate-x-0">
            {/* DOCK BAR */}
            <div className="pointer-events-auto relative flex max-w-full items-center gap-1.5 overflow-x-auto rounded-[1.75rem] border border-border/55 bg-background/78 px-2 pb-3 pt-1.5 shadow-[0_22px_55px_-30px_rgba(15,23,42,0.75)] ring-1 ring-white/65 backdrop-blur-2xl transition-all duration-500 [scrollbar-width:none] [-ms-overflow-style:none] before:pointer-events-none before:absolute before:inset-x-8 before:top-1 before:h-px before:bg-white/70 [&::-webkit-scrollbar]:hidden dark:bg-background/70 dark:ring-white/10 dark:before:bg-white/12 min-[480px]:w-full min-[480px]:justify-center sm:w-auto sm:justify-start sm:gap-2.5 sm:px-3 sm:pb-3 sm:pt-2 lg:max-h-[calc(100dvh-4rem)] lg:flex-col lg:overflow-x-hidden lg:overflow-y-auto lg:px-2.5 lg:py-3">
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
                    icon={Settings}
                    label={t.orbitSettings}
                    isActive={activeTab === 'settings'}
                    onClick={() => handleTabChange('settings')}
                />
            </div>
        </div>
    );
}
