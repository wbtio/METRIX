'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import type { User } from '@supabase/supabase-js';

interface OrbitShellProps {
    children: React.ReactNode;
    className?: string;
    backgroundIntensity?: 'low' | 'medium' | 'high';
    user?: User | null;
}

export default function OrbitShell({
    children,
    className
}: OrbitShellProps) {
    return (
        <div className="relative min-h-[100dvh] w-full bg-background text-foreground selection:bg-primary/30 font-sans transition-colors duration-300">

            {/* Content Container */}
            <main className={cn(
                "relative z-10 flex min-h-[100dvh] w-full flex-col",
                className
            )}>
                {children}
            </main>

        </div>
    );
}
