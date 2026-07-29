import { HeartPulse } from 'lucide-react';

export default function Loading() {
  return (
    <div className="flex min-h-[60dvh] flex-col items-center justify-center gap-3">
      <HeartPulse className="h-12 w-12 animate-pulse text-primary" />
      <p className="text-elder-base font-semibold text-muted-foreground">खुल रहा है…</p>
    </div>
  );
}
