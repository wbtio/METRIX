'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { Check, Palette, RotateCcw, Smile } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import {
  getTaskEmojiCategoryKey,
  getTaskEmojiOptions,
  TASK_EMOJI_CATEGORIES,
  type TaskEmojiCategoryKey,
} from '@/lib/task-appearance';
import { type Language } from '@/lib/translations';
import {
  getTaskAccent,
  normalizeTaskColorKey,
  TASK_COLOR_OPTIONS,
  type TaskColorKey,
} from '@/lib/task-colors';

interface TaskAppearancePickerProps {
  value?: string | null;
  seed?: string | null;
  currentEmoji?: string | null;
  language?: Language;
  align?: 'start' | 'center' | 'end';
  onEmojiSelect: (emoji: string) => void;
  onColorSelect: (color: TaskColorKey | null) => void;
  children: ReactNode;
}

type PickerMode = 'emoji' | 'color';

export default function TaskAppearancePicker({
  value,
  seed,
  currentEmoji,
  language = 'en',
  align = 'start',
  onEmojiSelect,
  onColorSelect,
  children,
}: TaskAppearancePickerProps) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<PickerMode>('emoji');
  const [emojiCategory, setEmojiCategory] = useState<TaskEmojiCategoryKey>(() =>
    getTaskEmojiCategoryKey(currentEmoji),
  );
  const isArabic = language === 'ar';
  const selectedKey = normalizeTaskColorKey(value);
  const autoAccent = useMemo(() => getTaskAccent(seed), [seed]);

  const emojiOptions = useMemo(
    () => getTaskEmojiOptions(emojiCategory, currentEmoji),
    [currentEmoji, emojiCategory],
  );

  const labels = isArabic
    ? { emoji: 'إيموجي', color: 'لون', auto: 'تلقائي' }
    : { emoji: 'Emoji', color: 'Color', auto: 'Auto' };

  const closePicker = () => setOpen(false);

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (nextOpen) setEmojiCategory(getTaskEmojiCategoryKey(currentEmoji));
      }}
    >
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        align={align}
        sideOffset={8}
        className="w-[18.5rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border-border/70 bg-popover/95 p-2 shadow-2xl backdrop-blur-xl"
      >
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="inline-flex rounded-xl border border-border/60 bg-muted/30 p-1">
            <button
              type="button"
              onClick={() => setMode('emoji')}
              className={cn(
                'inline-flex h-8 min-w-10 items-center justify-center rounded-lg px-2 text-base transition-all',
                mode === 'emoji'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-background/70 hover:text-foreground',
              )}
              aria-label={labels.emoji}
              title={labels.emoji}
            >
              <span>{currentEmoji || '📝'}</span>
            </button>
            <button
              type="button"
              onClick={() => setMode('color')}
              className={cn(
                'inline-flex h-8 w-10 items-center justify-center rounded-lg transition-all',
                mode === 'color'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-background/70 hover:text-foreground',
              )}
              aria-label={labels.color}
              title={labels.color}
            >
              <Palette className="h-4 w-4" />
            </button>
          </div>

          {mode === 'color' ? (
            <button
              type="button"
              onClick={() => {
                onColorSelect(null);
                closePicker();
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
          ) : (
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border/60 bg-background/80 text-muted-foreground">
              <Smile className="h-4 w-4" />
            </span>
          )}
        </div>

        {mode === 'emoji' ? (
          <>
            <div className="scrollbar-thin mb-2 flex gap-1 overflow-x-auto pb-0.5">
              {TASK_EMOJI_CATEGORIES.map((category) => {
                const isSelected = emojiCategory === category.key;
                const label = isArabic ? category.labelAr : category.labelEn;

                return (
                  <button
                    key={category.key}
                    type="button"
                    onClick={() => setEmojiCategory(category.key)}
                    className={cn(
                      'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border text-base transition-all hover:bg-muted/40',
                      isSelected
                        ? 'border-primary/35 bg-primary/10 shadow-sm shadow-primary/10'
                        : 'border-border/55 bg-background/70 text-muted-foreground',
                    )}
                    aria-label={label}
                    title={label}
                  >
                    {category.icon}
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-6 gap-1.5">
              {emojiOptions.map((emoji) => {
                const isSelected = emoji === currentEmoji;

                return (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => {
                      onEmojiSelect(emoji);
                      closePicker();
                    }}
                    className={cn(
                      'relative flex h-10 w-full items-center justify-center rounded-xl border text-[18px] transition-all hover:-translate-y-0.5 hover:bg-muted/40',
                      isSelected
                        ? 'border-primary/35 bg-primary/10 shadow-sm shadow-primary/10'
                        : 'border-border/55 bg-background/75',
                    )}
                    aria-label={emoji}
                    title={emoji}
                  >
                    {emoji}
                    {isSelected ? (
                      <span className="absolute end-1 top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <Check className="h-2.5 w-2.5" />
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </>
        ) : (
          <div className="grid grid-cols-5 gap-2">
            {TASK_COLOR_OPTIONS.map((accent) => {
              const isSelected = selectedKey === accent.key;

              return (
                <button
                  key={accent.key}
                  type="button"
                  onClick={() => {
                    onColorSelect(accent.key);
                    closePicker();
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
        )}
      </PopoverContent>
    </Popover>
  );
}
