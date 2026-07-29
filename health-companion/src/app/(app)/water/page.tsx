import { Droplets } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { todayStr } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { WaterControls } from './water-controls';
import type { WaterLog } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function WaterPage() {
  const supabase = await createClient();
  const today = todayStr();

  const [{ data: log }, { data: history }] = await Promise.all([
    supabase.from('water_logs').select('*').eq('log_date', today).maybeSingle<WaterLog>(),
    supabase
      .from('water_logs')
      .select('*')
      .order('log_date', { ascending: false })
      .limit(7)
      .returns<WaterLog[]>(),
  ]);

  const glasses = log?.glasses ?? 0;
  const goal = log?.goal_glasses ?? 8;
  const pct = Math.min(100, Math.round((glasses / goal) * 100));

  return (
    <div className="space-y-4 animate-fade-in-up">
      <h1 className="flex items-center gap-2 text-elder-xl font-bold">
        <Droplets className="h-8 w-8 text-sky-500" /> पानी
      </h1>

      <Card className="glass">
        <CardContent className="space-y-4 p-6 text-center">
          <p className="text-6xl font-bold tabular-nums text-sky-500">
            {glasses}
            <span className="text-2xl text-muted-foreground">/{goal}</span>
          </p>
          <p className="text-elder-base font-semibold">गिलास पानी ({pct}% पूरा)</p>
          <div className="flex justify-center gap-1" aria-hidden="true">
            {Array.from({ length: goal }).map((_, i) => (
              <Droplets
                key={i}
                className={i < glasses ? 'h-8 w-8 fill-sky-400 text-sky-500' : 'h-8 w-8 text-muted'}
              />
            ))}
          </div>
          <Progress value={pct} barClassName="bg-sky-500" />
          <WaterControls />
          {pct >= 100 && (
            <p className="rounded-2xl bg-success/10 p-3 text-elder-base font-bold text-success">
              शाबाश! आज का लक्ष्य पूरा हो गया 🎉
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>पिछले 7 दिन</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {(history ?? []).map((h) => (
              <li key={h.id} className="flex items-center gap-3">
                <span className="w-24 text-base text-muted-foreground">
                  {new Date(h.log_date + 'T00:00:00').toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                  })}
                </span>
                <Progress
                  value={(h.glasses / h.goal_glasses) * 100}
                  className="flex-1"
                  barClassName="bg-sky-500"
                />
                <span className="w-14 text-right text-base font-semibold tabular-nums">
                  {h.glasses}/{h.goal_glasses}
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
