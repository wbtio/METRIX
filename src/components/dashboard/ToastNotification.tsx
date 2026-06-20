'use client';

import { CheckSquare } from 'lucide-react';

import { cn } from '@/lib/utils';

interface ToastNotificationProps {
  message: string;
  visible: boolean;
}

export default function ToastNotification({ message, visible }: ToastNotificationProps) {
  return (
    <div 
      className={cn(
        "fixed bottom-24 sm:bottom-28 left-1/2 -translate-x-1/2 z-50 px-4 transition-all duration-300 ease-out-quart",
        visible 
          ? "opacity-100 translate-y-0 scale-100 pointer-events-auto" 
          : "opacity-0 translate-y-4 scale-95 pointer-events-none"
      )}
    >
      <div className="bg-primary text-primary-foreground px-5 py-3 rounded-2xl shadow-xl shadow-primary/15 border border-primary/20 font-bold text-sm flex items-center gap-2.5 max-w-[90vw] backdrop-blur-sm">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-primary-foreground/15">
          <CheckSquare className="w-3.5 h-3.5 shrink-0" />
        </span>
        <span className="truncate">{message}</span>
      </div>
    </div>
  );
}
