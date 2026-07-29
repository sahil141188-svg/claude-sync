'use client';

import { useEffect, useState } from 'react';

/** Live date + time header for the dashboard. */
export function LiveClock() {
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
      <p className="text-elder-base font-semibold text-muted-foreground">{date}</p>
      <p className="text-elder-xl font-bold tabular-nums">{time}</p>
    </div>
  );
}
