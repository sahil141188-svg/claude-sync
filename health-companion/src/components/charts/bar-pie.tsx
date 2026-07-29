'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const tooltipStyle = {
  borderRadius: 16,
  border: '1px solid hsl(var(--border))',
  background: 'hsl(var(--card))',
  color: 'hsl(var(--card-foreground))',
};

export function ComplianceBarChart({
  data,
}: {
  data: { label: string; taken: number; missed: number }[];
}) {
  if (data.length === 0) {
    return <p className="p-6 text-center text-elder-base text-muted-foreground">अभी data नहीं है</p>;
  }
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis dataKey="label" tick={{ fontSize: 13 }} stroke="hsl(var(--muted-foreground))" />
        <YAxis tick={{ fontSize: 13 }} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
        <Tooltip contentStyle={tooltipStyle} />
        <Legend />
        <Bar dataKey="taken" name="ली गई" stackId="a" fill="#10b981" radius={[6, 6, 0, 0]} />
        <Bar dataKey="missed" name="छूटी" stackId="a" fill="#ef4444" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

const PIE_COLORS = ['#1d6fd1', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444'];

export function DistributionPieChart({
  data,
}: {
  data: { name: string; value: number }[];
}) {
  if (data.length === 0) {
    return <p className="p-6 text-center text-elder-base text-muted-foreground">अभी data नहीं है</p>;
  }
  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius={50} outerRadius={85} paddingAngle={3}>
          {data.map((_, i) => (
            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip contentStyle={tooltipStyle} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}
