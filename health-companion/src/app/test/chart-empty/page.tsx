import { TrendChart } from '@/components/charts/trend-chart';

export const dynamic = 'force-dynamic';

export default function TestChartEmpty() {
  return (
    <div>
      <p>chart-empty ok</p>
      <TrendChart data={[]} series={[{ key: 'v', label: 'V', color: '#000' }]} />
    </div>
  );
}
