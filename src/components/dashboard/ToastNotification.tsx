'use client';

import { CheckSquare } from 'lucide-react';

interface ToastNotificationProps {
  message: string;
  visible: boolean;
}

export default function ToastNotification({ message, visible }: ToastNotificationProps) {
  if (!visible) return null;

  return (
    <div className="fixed bottom-24 sm:bottom-28 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300 px-4">
      <div className="bg-primary text-primary-foreground px-4 py-2.5 rounded-xl shadow-lg border border-primary/20 font-semibold text-sm flex items-center gap-2 max-w-[90vw]">
        <CheckSquare className="w-4 h-4 shrink-0" />
        <span className="truncate">{message}</span>
      </div>
    </div>
  );
}
