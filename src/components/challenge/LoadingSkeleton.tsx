'use client';

export function LoadingSkeleton() {
  return (
    <div className="space-y-2.5 animate-pulse">
      <div className="rounded-2xl border border-border/70 bg-background/70 p-3">
        <div className="h-4 w-28 rounded bg-muted/40" />
        <div className="mt-2 h-3 w-2/3 rounded bg-muted/30" />
        <div className="mt-3 h-10 rounded-xl bg-muted/25" />
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="h-36 rounded-2xl border border-border/70 bg-background/60" />
        <div className="h-36 rounded-2xl border border-border/70 bg-background/60" />
      </div>
    </div>
  );
}
