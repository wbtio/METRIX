'use client';

import { Target, LayoutDashboard } from 'lucide-react';
import { getIconComponent } from './IconPicker';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarGroup,
    SidebarGroupLabel,
    SidebarGroupContent,
    useSidebar,
} from "@/components/ui/sidebar";

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
    goals: any[];
    selectedGoalId: string | null;
    onSelectGoal: (id: string | null) => void;
}

export default function AppSidebar({ goals, selectedGoalId, onSelectGoal, ...props }: AppSidebarProps) {
    const { isMobile, setOpenMobile } = useSidebar();

    const handleGoalSelect = (id: string | null) => {
        onSelectGoal(id);
        if (isMobile) {
            setOpenMobile(false);
        }
    };

    return (
        <Sidebar {...props}>
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <button>
                                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                                    <Target className="size-4" />
                                </div>
                                <div className="flex flex-col gap-0.5 leading-none text-left">
                                    <span className="font-semibold">Metric</span>
                                    <span className="text-xs">v1.0.0</span>
                                </div>
                            </button>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupLabel>Menu</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            <SidebarMenuItem>
                                <SidebarMenuButton 
                                    isActive={selectedGoalId === null}
                                    onClick={() => handleGoalSelect(null)}
                                >
                                    <LayoutDashboard />
                                    <span>New Goal / Home</span>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>

                <SidebarGroup>
                    <SidebarGroupLabel>Your Goals ({goals.length})</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {goals.map((goal) => {
                                const Icon = getIconComponent(goal.icon || 'Target');
                                return (
                                    <SidebarMenuItem key={goal.id}>
                                        <SidebarMenuButton 
                                            isActive={selectedGoalId === goal.id}
                                            onClick={() => handleGoalSelect(goal.id)}
                                            className="group/goal"
                                        >
                                            <Icon className={`size-4 ${selectedGoalId === goal.id ? 'text-primary' : 'text-muted-foreground group-hover/goal:text-primary'}`} />
                                            <span>{goal.title}</span>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                );
                            })}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>

            <SidebarFooter>
                 <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg">
                            <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-gradient-to-tr from-primary to-chart-4">
                                {/* User Avatar/Initial could go here */}
                            </div>
                            <div className="flex flex-col gap-0.5 leading-none text-left">
                                <span className="font-semibold">My Account</span>
                                <span className="text-xs text-muted-foreground">Free Plan</span>
                            </div>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarFooter>
        </Sidebar>
    );
}
