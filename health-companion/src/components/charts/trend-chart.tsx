'use client';

import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

export interface Series {
  key: string;
  label: string;
  color: string;
}

export function TrendChart({
  data,
  series,
  referenceY,
  height = 260,
}: {
  data: Record<string, string | number | null>[];
  series: Series[];
  referenceY?: { value: number; label: string };
  height?: number;
}) {
  if (data.length === 0) {
    return (
      <div
        className="flex items-center justify-center rounded-2xl bg-muted text-elder-base text-muted-foreground"
        style={{ height }}
      >
        अभी कोई data नहीं है
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis dataKey="label" tick={{ fontSize: 13 }} stroke="hsl(var(--muted-foreground))" />
        <YAxis tick={{ fontSize: 13 }} stroke="hsl(var(--muted-foreground))" domain={['auto', 'auto']} />
        <Tooltip
          contentStyle={{
            borderRadius: 16,
            border: '1px solid hsl(var(--border))',
            background: 'hsl(var(--card))',
            color: 'hsl(var(--card-foreground))',
          }}
        />
        {referenceY && (
          <ReferenceLine
            y={referenceY.value}
            stroke="hsl(var(--destructive))"
            strokeDasharray="6 4"
            label={{ value: referenceY.label, fontSize: 12, fill: 'hsl(var(--destructive))' }}
          />
        )}
        {series.map((s) => (
          <Line
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.label}
            stroke={s.color}
            strokeWidth={3}
            dot={{ r: 4 }}
            connectNulls
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
