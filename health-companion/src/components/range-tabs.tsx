'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';

const RANGES = [
  ['daily', 'Daily'],
  ['weekly', 'Weekly'],
  ['monthly', 'Monthly'],
  ['yearly', 'Yearly'],
] as const;

export type Range = (typeof RANGES)[number][0];

export function rangeDays(range: string): number {
  return { daily: 1, weekly: 7, monthly: 30, yearly: 365 }[range] ?? 7;
}

export function RangeTabs({ exclude = [] }: { exclude?: string[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const active = params.get('range') ?? 'weekly';

  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {RANGES.filter(([r]) => !exclude.includes(r)).map(([range, label]) => (
        <button
          key={range}
          onClick={() => router.replace(`${pathname}?range=${range}`)}
          className={cn(
            'rounded-full px-5 py-2 text-base font-semibold transition-colors',
            active === range
              ? 'bg-primary text-primary-foreground shadow'
              : 'bg-muted text-muted-foreground'
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
