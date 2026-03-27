'use client';

import { useMemo, useState } from 'react';
import { buildFallbackAvatar, initialFromName } from './challenge-utils';

interface PlayerAvatarProps {
  avatarUrl: string | null | undefined;
  displayName: string;
}

export function PlayerAvatar({ avatarUrl, displayName }: PlayerAvatarProps) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const fallbackAvatar = useMemo(() => buildFallbackAvatar(displayName), [displayName]);
  const src = avatarUrl && failedUrl !== avatarUrl ? avatarUrl : fallbackAvatar;

  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border/70 bg-muted/40 text-sm font-black text-foreground">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={displayName || initialFromName(displayName)}
        className="h-full w-full object-cover"
        loading="lazy"
        onError={() => {
          if (avatarUrl && failedUrl !== avatarUrl) setFailedUrl(avatarUrl);
        }}
      />
    </div>
  );
}
