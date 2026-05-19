'use client';

export function LoadingSkeleton() {
  return (
    <div className="space-y-2.5 animate-pulse">
      <div className="rounded-xl border border-border/60 bg-card p-3 shadow-sm shadow-black/[0.02]">
        <div className="h-4 w-28 rounded bg-muted/40" />
        <div className="mt-2 h-3 w-2/3 rounded bg-muted/30" />
        <div className="mt-3 h-10 rounded-lg bg-muted/20" />
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="h-36 rounded-xl border border-border/60 bg-card shadow-sm shadow-black/[0.02]" />
        <div className="h-36 rounded-xl border border-border/60 bg-card shadow-sm shadow-black/[0.02]" />
      </div>
    </div>
  );
}
