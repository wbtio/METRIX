'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { ArrowLeft, ArrowRight, Check, Palette, Smile } from 'lucide-react';
import EmojiPicker, { Theme } from 'emoji-picker-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
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

type PickerMode = 'menu' | 'emoji' | 'color';

const copy = {
  en: {
    title: 'Task appearance',
    subtitle: 'Choose what you want to update.',
    emoji: 'Change emoji',
    emojiHint: 'Pick a new icon for this task',
    color: 'Change color',
    colorHint: 'Update the saved accent color',
    colorTitle: 'Task color',
    colorSubtitle: 'Choose a saved accent or go back to auto.',
    emojiTitle: 'Choose emoji',
    emojiSubtitle: 'Select the icon that fits this task.',
    auto: 'Auto',
    autoHint: 'Use a stable generated color',
    back: 'Back',
  },
  ar: {
    title: 'مظهر المهمة',
    subtitle: 'اختر الشيء الذي تريد تعديله.',
    emoji: 'تغيير الإيموجي',
    emojiHint: 'اختر أيقونة جديدة لهذه المهمة',
    color: 'تغيير اللون',
    colorHint: 'حدّث اللون المحفوظ للمهمة',
    colorTitle: 'لون المهمة',
    colorSubtitle: 'اختر لونًا محفوظًا أو ارجع للوضع التلقائي.',
    emojiTitle: 'اختيار الإيموجي',
    emojiSubtitle: 'اختر الأيقونة المناسبة لهذه المهمة.',
    auto: 'تلقائي',
    autoHint: 'استخدم لونًا ثابتًا مولدًا تلقائيًا',
    back: 'رجوع',
  },
} as const;

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
  const [mode, setMode] = useState<PickerMode>('menu');
  const isArabic = language === 'ar';
  const text = copy[language];
  const selectedKey = normalizeTaskColorKey(value);
  const autoAccent = useMemo(() => getTaskAccent(seed), [seed]);
  const selectedAccent = selectedKey ? getTaskAccent(seed, selectedKey) : autoAccent;
  const BackIcon = isArabic ? ArrowRight : ArrowLeft;

  const closePicker = () => {
    setOpen(false);
    setMode('menu');
  };

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) setMode('menu');
      }}
    >
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        align={align}
        className={cn(
          'overflow-hidden rounded-2xl border-border/70 p-0 shadow-xl',
          mode === 'emoji' ? 'w-auto' : 'w-72',
        )}
      >
        {mode === 'menu' && (
          <div className="p-3">
            <div className="mb-3">
              <div className="text-sm font-black text-foreground">{text.title}</div>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">{text.subtitle}</p>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setMode('emoji')}
                className="flex w-full items-center gap-3 rounded-2xl border border-border/70 px-3 py-3 text-start transition-colors hover:bg-muted/20"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-lg">
                  {currentEmoji || '📝'}
                </span>
                <span className="flex-1">
                  <span className="block text-xs font-black text-foreground">{text.emoji}</span>
                  <span className="block text-[11px] text-muted-foreground">{text.emojiHint}</span>
                </span>
                <Smile className="h-4 w-4 text-primary" />
              </button>

              <button
                type="button"
                onClick={() => setMode('color')}
                className={cn(
                  'flex w-full items-center gap-3 rounded-2xl border px-3 py-3 text-start transition-colors hover:bg-muted/20',
                  selectedAccent.softClass,
                  selectedAccent.borderClass,
                )}
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-background/40 bg-background/70">
                  <span className={cn('h-4 w-4 rounded-full ring-2 ring-background', selectedAccent.swatchClass)} />
                </span>
                <span className="flex-1">
                  <span className="block text-xs font-black text-foreground">{text.color}</span>
                  <span className="block text-[11px] text-muted-foreground">{text.colorHint}</span>
                </span>
                <Palette className={cn('h-4 w-4', selectedAccent.textClass)} />
              </button>
            </div>
          </div>
        )}

        {mode === 'emoji' && (
          <div>
            <div className="flex items-center justify-between border-b border-border/60 px-3 py-2.5">
              <button
                type="button"
                onClick={() => setMode('menu')}
                className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted/30 hover:text-foreground"
              >
                <BackIcon className="h-3.5 w-3.5" />
                {text.back}
              </button>
              <div className="text-center">
                <div className="text-xs font-black text-foreground">{text.emojiTitle}</div>
                <p className="text-[11px] text-muted-foreground">{text.emojiSubtitle}</p>
              </div>
              <span className="w-10 shrink-0" />
            </div>
            <EmojiPicker
              onEmojiClick={(emojiData) => {
                onEmojiSelect(emojiData.emoji);
                closePicker();
              }}
              theme={Theme.AUTO}
              lazyLoadEmojis={true}
            />
          </div>
        )}

        {mode === 'color' && (
          <div className="p-3">
            <div className="mb-3 flex items-start gap-2">
              <button
                type="button"
                onClick={() => setMode('menu')}
                className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted/30 hover:text-foreground"
                title={text.back}
              >
                <BackIcon className="h-4 w-4" />
              </button>
              <div>
                <div className="text-sm font-black text-foreground">{text.colorTitle}</div>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">{text.colorSubtitle}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                onColorSelect(null);
                closePicker();
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
                      onColorSelect(accent.key);
                      closePicker();
                    }}
                    className={cn(
                      'rounded-2xl border px-2 py-2 text-center transition-all hover:-translate-y-0.5',
                      accent.softClass,
                      accent.borderClass,
                      isSelected && 'ring-2 ring-primary/30',
                    )}
                  >
                    <span className={cn('mx-auto mb-2 block h-5 w-5 rounded-full ring-2 ring-background', accent.swatchClass)} />
                    <span className={cn('block text-[10px] font-bold', accent.textClass)}>
                      {isArabic ? accent.labelAr : accent.labelEn}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
