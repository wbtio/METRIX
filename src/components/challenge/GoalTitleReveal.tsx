'use client';

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface GoalTitleRevealProps {
  title: string | null | undefined;
  isArabic: boolean;
}

export function GoalTitleReveal({ title, isArabic }: GoalTitleRevealProps) {
  const safeTitle = title?.trim() || '—';

  if (safeTitle === '—') {
    return <p className="truncate text-[11px] text-muted-foreground">—</p>;
  }

  const triggerClassName =
    'w-full truncate text-[11px] leading-5 text-muted-foreground transition-colors hover:text-foreground';
  const titleStyle = { textAlign: isArabic ? ('right' as const) : ('left' as const) };

  return (
    <>
      <div className="hidden sm:block min-w-0">
        <Tooltip>
          <TooltipTrigger asChild>
            <button type="button" className={triggerClassName} style={titleStyle}>
              {safeTitle}
            </button>
          </TooltipTrigger>
          <TooltipContent side={isArabic ? 'left' : 'right'} sideOffset={8} className="max-w-xs whitespace-normal break-words">
            {safeTitle}
          </TooltipContent>
        </Tooltip>
      </div>

      <div className="sm:hidden min-w-0">
        <Popover>
          <PopoverTrigger asChild>
            <button type="button" className={triggerClassName} style={titleStyle}>
              {safeTitle}
            </button>
          </PopoverTrigger>
          <PopoverContent align={isArabic ? 'end' : 'start'} side="top" sideOffset={8} className="w-60 p-3">
            <p className="text-xs leading-relaxed break-words">{safeTitle}</p>
          </PopoverContent>
        </Popover>
      </div>
    </>
  );
}
