'use client';

import { useState, type ReactNode } from 'react';
import { Check, Palette, RotateCcw } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { type Language } from '@/lib/translations';
import { cn } from '@/lib/utils';
import {
  getTaskAccent,
  normalizeTaskColorKey,
  TASK_COLOR_OPTIONS,
  type TaskColorKey,
} from '@/lib/task-colors';

interface TaskColorPickerProps {
  value?: string | null;
  seed?: string | null;
  language?: Language;
  align?: 'start' | 'center' | 'end';
  onSelect: (color: TaskColorKey | null) => void;
  children: ReactNode;
}

export default function TaskColorPicker({
  value,
  seed,
  language = 'en',
  align = 'start',
  onSelect,
  children,
}: TaskColorPickerProps) {
  const [open, setOpen] = useState(false);
  const isArabic = language === 'ar';
  const selectedKey = normalizeTaskColorKey(value);
  const autoAccent = getTaskAccent(seed);
  const labels = isArabic ? { color: 'لون', auto: 'تلقائي' } : { color: 'Color', auto: 'Auto' };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        className="w-[18.5rem] max-w-[calc(100vw-2rem)] rounded-2xl border-border/70 bg-popover/95 p-2 shadow-2xl backdrop-blur-xl"
        align={align}
        sideOffset={8}
      >
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border/60 bg-background/80 text-muted-foreground">
            <Palette className="h-4 w-4" />
          </span>
          <button
            type="button"
            onClick={() => {
              onSelect(null);
              setOpen(false);
            }}
            className={cn(
              'inline-flex h-9 w-9 items-center justify-center rounded-xl border transition-all hover:-translate-y-0.5',
              !selectedKey
                ? cn(autoAccent.softClass, autoAccent.borderClass, autoAccent.textClass)
                : 'border-border/60 bg-background/80 text-muted-foreground hover:text-foreground',
            )}
            aria-label={labels.auto}
            title={labels.auto}
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-5 gap-2">
          {TASK_COLOR_OPTIONS.map((accent) => {
            const isSelected = selectedKey === accent.key;

            return (
              <button
                key={accent.key}
                type="button"
                onClick={() => {
                  onSelect(accent.key);
                  setOpen(false);
                }}
                className={cn(
                  'relative flex h-11 items-center justify-center rounded-xl border transition-all hover:-translate-y-0.5',
                  accent.softClass,
                  accent.borderClass,
                  isSelected && 'ring-2 ring-primary/25',
                )}
                aria-label={isArabic ? accent.labelAr : accent.labelEn}
                title={isArabic ? accent.labelAr : accent.labelEn}
              >
                <span className={cn('h-5 w-5 rounded-full ring-2 ring-background', accent.swatchClass)} />
                {isSelected ? (
                  <span className="absolute end-1 top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Check className="h-2.5 w-2.5" />
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
