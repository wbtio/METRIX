'use client';

import { useState, type ReactNode } from 'react';
import { Check, Palette } from 'lucide-react';
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

const copy = {
  en: {
    title: 'Main task color',
    subtitle: 'Choose a saved accent or go back to auto.',
    auto: 'Auto',
    autoHint: 'Use a stable generated color',
  },
  ar: {
    title: 'لون المهمة الرئيسية',
    subtitle: 'اختر لونًا محفوظًا أو ارجع للوضع التلقائي.',
    auto: 'تلقائي',
    autoHint: 'استخدم لونًا ثابتًا مولدًا تلقائيًا',
  },
} as const;

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
  const text = copy[language];
  const selectedKey = normalizeTaskColorKey(value);
  const autoAccent = getTaskAccent(seed);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-64 rounded-2xl border-border/70 p-3 shadow-xl" align={align}>
        <div className="mb-3">
          <div className="flex items-center gap-2 text-sm font-black text-foreground">
            <Palette className="h-4 w-4 text-primary" />
            {text.title}
          </div>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">{text.subtitle}</p>
        </div>

        <button
          type="button"
          onClick={() => {
            onSelect(null);
            setOpen(false);
          }}
          className={cn(
            'mb-3 flex w-full items-center gap-3 rounded-2xl border px-3 py-2.5 text-start transition-colors hover:bg-muted/20',
            !selectedKey ? cn(autoAccent.softClass, autoAccent.borderClass) : 'border-border/70',
          )}
        >
          <span className={cn('h-4 w-4 rounded-full ring-2 ring-background', autoAccent.swatchClass)} />
          <span className="flex-1">
            <span className="block text-xs font-black text-foreground">{text.auto}</span>
            <span className="block text-[11px] text-muted-foreground">{text.autoHint}</span>
          </span>
          {!selectedKey ? <Check className="h-4 w-4 text-primary" /> : null}
        </button>

        <div className="grid grid-cols-3 gap-2">
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
                  'rounded-2xl border px-2 py-2 text-center transition-all hover:-translate-y-0.5',
                  accent.softClass,
                  accent.borderClass,
                  isSelected && 'ring-2 ring-primary/30',
                )}
                title={isArabic ? accent.labelAr : accent.labelEn}
              >
                <span className={cn('mx-auto mb-2 block h-5 w-5 rounded-full ring-2 ring-background', accent.swatchClass)} />
                <span className={cn('block text-[10px] font-bold', accent.textClass)}>
                  {isArabic ? accent.labelAr : accent.labelEn}
                </span>
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
