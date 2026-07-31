import { TrendChart } from '@/components/charts/trend-chart';

export const dynamic = 'force-dynamic';

export default function TestChartData() {
  return (
    <div>
      <p>chart-data ok</p>
      <TrendChart
        data={[
          { label: 'a', v: 100 },
          { label: 'b', v: 120 },
        ]}
        series={[{ key: 'v', label: 'V', color: '#000' }]}
        referenceY={{ value: 110, label: 'ref' }}
      />
    </div>
  );
}
