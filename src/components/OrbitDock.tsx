'use client';

import * as React from 'react';
import { Home, History, Settings, Plus, LayoutDashboard, Target, ChevronUp } from 'lucide-react';
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
                            "relative flex items-center justify-center w-12 h-12 rounded-2xl transition-all duration-300 ease-out group",
                            isActive
                                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30 scale-110 -translate-y-2"
                                : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground hover:scale-105 hover:-translate-y-1"
                        )}
                    >
                        <Icon className="w-5 h-5" />
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
    goals?: any[];
    selectedGoalId?: string | null;
    onSelectGoal?: (id: string | null) => void;
    activeTab?: string;
    onTabChange?: (tab: string) => void;
    language?: Language;
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

    const handleTabChange = (tab: string) => {
        if (onTabChange) onTabChange(tab);
    };

    return (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-4">
            {/* DOCK BAR */}
            <div className="flex items-center gap-3 px-4 py-3 bg-background/60 backdrop-blur-xl border border-border rounded-3xl shadow-2xl ring-1 ring-border/10">

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

                <div className="w-px h-8 bg-border mx-1" />

                {/* PINNED GOALS */}
                {goals.filter(g => g.is_pinned).map(goal => {
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

                {goals.some(g => g.is_pinned) && (
                    <div className="w-px h-8 bg-border mx-1" />
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
