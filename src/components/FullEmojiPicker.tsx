'use client';

import { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import EmojiPicker from 'emoji-picker-react';
import { Theme } from 'emoji-picker-react';

interface FullEmojiPickerProps {
  onSelect: (emoji: string) => void;
  children: React.ReactNode;
}

export default function FullEmojiPicker({ onSelect, children }: FullEmojiPickerProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {children}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 border-none shadow-2xl" align="start">
        <EmojiPicker 
          onEmojiClick={(emojiData) => {
            onSelect(emojiData.emoji);
            setOpen(false);
          }}
          theme={Theme.AUTO}
          lazyLoadEmojis={true}
        />
      </PopoverContent>
    </Popover>
  );
}
