import { detectTrend, sugarSuggestion, trendLabelHi } from '@/lib/trend';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const dynamic = 'force-dynamic';

export default function TestUi() {
  const trend = detectTrend([100, 110, 120]);
  return (
    <Card>
      <CardHeader>
        <CardTitle>v-ui ok</CardTitle>
      </CardHeader>
      <CardContent>
        <Badge>{trendLabelHi(trend)}</Badge>
        <p>{sugarSuggestion(trend, 120)}</p>
      </CardContent>
    </Card>
  );
}
