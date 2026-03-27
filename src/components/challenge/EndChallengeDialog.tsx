'use client';

import { Flag, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface EndChallengeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  busyAction: 'create' | 'join' | 'end' | null;
  isArabic: boolean;
  t: {
    challengeEndConfirmTitle: string;
    challengeEndConfirmDesc: string;
    challengeEndConfirmCancel: string;
    challengeEndConfirmAction: string;
  };
}

export function EndChallengeDialog({
  open,
  onOpenChange,
  onConfirm,
  busyAction,
  isArabic,
  t,
}: EndChallengeDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]" dir={isArabic ? 'rtl' : 'ltr'}>
        <DialogHeader className={isArabic ? 'sm:text-right' : undefined}>
          <DialogTitle>{t.challengeEndConfirmTitle}</DialogTitle>
          <DialogDescription>{t.challengeEndConfirmDesc}</DialogDescription>
        </DialogHeader>
        <DialogFooter className={cn(isArabic && 'sm:flex-row-reverse sm:space-x-reverse')}>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="h-10 rounded-xl border border-border bg-background px-3 text-sm font-semibold hover:bg-muted"
          >
            {t.challengeEndConfirmCancel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busyAction !== null}
            className="flex h-10 items-center justify-center gap-1.5 rounded-xl border border-destructive/40 bg-destructive/10 px-3 text-sm font-semibold text-destructive hover:bg-destructive/20 disabled:opacity-60"
          >
            {busyAction === 'end' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Flag className="h-4 w-4" />}
            {t.challengeEndConfirmAction}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
