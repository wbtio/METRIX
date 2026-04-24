'use client';

import { useMemo, useState } from 'react';
import { Check } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  getTaskEmojiCategoryKey,
  getTaskEmojiOptions,
  TASK_EMOJI_CATEGORIES,
  type TaskEmojiCategoryKey,
} from '@/lib/task-appearance';
import { type Language } from '@/lib/translations';
import { cn } from '@/lib/utils';

interface FullEmojiPickerProps {
  onSelect: (emoji: string) => void;
  value?: string | null;
  language?: Language;
  children: React.ReactNode;
}

export default function FullEmojiPicker({ onSelect, value, language = 'en', children }: FullEmojiPickerProps) {
  const [open, setOpen] = useState(false);
  const [emojiCategory, setEmojiCategory] = useState<TaskEmojiCategoryKey>(() =>
    getTaskEmojiCategoryKey(value),
  );
  const emojiOptions = useMemo(
    () => getTaskEmojiOptions(emojiCategory, value),
    [emojiCategory, value],
  );

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (nextOpen) setEmojiCategory(getTaskEmojiCategoryKey(value));
      }}
    >
      <PopoverTrigger asChild>
        {children}
      </PopoverTrigger>
      <PopoverContent
        className="w-[18rem] max-w-[calc(100vw-2rem)] rounded-2xl border-border/70 bg-popover/95 p-2 shadow-2xl backdrop-blur-xl"
        align="start"
        sideOffset={8}
      >
        <div className="scrollbar-thin mb-2 flex gap-1 overflow-x-auto pb-0.5">
          {TASK_EMOJI_CATEGORIES.map((category) => {
            const isSelected = emojiCategory === category.key;
            const label = language === 'ar' ? category.labelAr : category.labelEn;

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
            const isSelected = emoji === value;

            return (
              <button
                key={emoji}
                type="button"
                onClick={() => {
                  onSelect(emoji);
                  setOpen(false);
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
      </PopoverContent>
    </Popover>
  );
}
