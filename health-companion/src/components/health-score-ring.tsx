import { cn } from '@/lib/utils';

/** SVG ring showing the 0–100 daily health score. */
export function HealthScoreRing({ score, size = 120 }: { score: number; size?: number }) {
  const r = size / 2 - 10;
  const c = 2 * Math.PI * r;
  const pct = Math.min(100, Math.max(0, score));
  const color =
    pct >= 75 ? 'text-success' : pct >= 50 ? 'text-amber-500' : 'text-destructive';

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={10}
          className="fill-none stroke-muted"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={10}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (pct / 100) * c}
          className={cn('fill-none stroke-current transition-all duration-700', color)}
        />
      </svg>
      <div className="absolute text-center">
        <p className={cn('text-3xl font-bold tabular-nums', color)}>{pct}</p>
        <p className="text-xs font-semibold text-muted-foreground">/100</p>
      </div>
    </div>
  );
}
