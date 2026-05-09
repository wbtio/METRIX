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

            {/* Dynamic Background Mesh */}
            <div className="fixed inset-0 z-0 pointer-events-none">

                {/* Main Orb - Top Right */}
                <div className="absolute -top-[10%] -right-[10%] w-[50vw] h-[50vw] rounded-full bg-primary/10 blur-[120px] mix-blend-multiply dark:mix-blend-screen animate-pulse duration-[10s]" />

                {/* Secondary Orb - Bottom Left */}
                <div className="absolute -bottom-[10%] -left-[10%] w-[40vw] h-[40vw] rounded-full bg-chart-1/10 blur-[100px] mix-blend-multiply dark:mix-blend-screen" />

                {/* Accent Orb - Center Top */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[60vw] h-[30vh] bg-chart-2/5 blur-[80px] mix-blend-multiply dark:mix-blend-screen" />

                {/* Noise Texture */}
                <div className="absolute inset-0 bg-[url('/noise.svg')] opacity-20 brightness-100 contrast-150 mix-blend-overlay dark:mix-blend-overlay" />
            </div>

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
