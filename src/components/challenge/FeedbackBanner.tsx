'use client';

import { cn } from '@/lib/utils';

interface FeedbackBannerProps {
  feedback: { type: 'success' | 'error'; text: string } | null;
}

export function FeedbackBanner({ feedback }: FeedbackBannerProps) {
  if (!feedback) return null;

  return (
    <div
      className={cn(
        'rounded-xl border px-3 py-2.5 text-sm',
        feedback.type === 'success'
          ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
          : 'border-destructive/25 bg-destructive/10 text-destructive',
      )}
    >
      {feedback.text}
    </div>
  );
}
