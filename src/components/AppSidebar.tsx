'use client';

import { Target, LayoutDashboard, LogOut } from 'lucide-react';
import { getIconComponent } from './IconPicker';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import type { User } from '@supabase/supabase-js';
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
    const supabase = createClient();
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);

    useEffect(() => {
        const getUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);
        };
        getUser();
    }, [supabase]);

    const handleGoalSelect = (id: string | null) => {
        onSelectGoal(id);
        if (isMobile) {
            setOpenMobile(false);
        }
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push('/login');
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
                        <SidebarMenuButton size="lg" className="group">
                            {user?.user_metadata?.avatar_url ? (
                                <img 
                                    src={user.user_metadata.avatar_url} 
                                    alt={user.user_metadata?.full_name || 'User'} 
                                    className="flex aspect-square size-8 rounded-lg object-cover"
                                />
                            ) : (
                                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-gradient-to-tr from-primary to-chart-4 text-primary-foreground font-semibold">
                                    {user?.user_metadata?.full_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
                                </div>
                            )}
                            <div className="flex flex-col gap-0.5 leading-none text-left flex-1 min-w-0">
                                <span className="font-semibold truncate">
                                    {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'}
                                </span>
                                <span className="text-xs text-muted-foreground truncate">
                                    {user?.email || 'No email'}
                                </span>
                            </div>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                        <SidebarMenuButton 
                            onClick={handleLogout}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                            <LogOut className="size-4" />
                            <span>Logout</span>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarFooter>
        </Sidebar>
    );
}
