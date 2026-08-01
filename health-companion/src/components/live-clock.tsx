'use client';

import { useEffect, useState } from 'react';

/** Live date + time header for the dashboard. `light` renders on gradients. */
export function LiveClock({ light = false }: { light?: boolean }) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  if (!now) return <div className="h-14" />;

  const date = now.toLocaleDateString('hi-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const time = now.toLocaleTimeString('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });

  return (
    <div>
      <p className={light ? 'text-elder-base font-semibold text-white/85' : 'text-elder-base font-semibold text-muted-foreground'}>
        {date}
      </p>
      <p className={light ? 'text-elder-xl font-bold tabular-nums text-white' : 'text-elder-xl font-bold tabular-nums'}>
        {time}
      </p>
    </div>
  );
}
