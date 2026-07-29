import { Bike, Brain, Dumbbell, Footprints, Heart } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { todayStr } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ExerciseForm } from './exercise-form';
import type { ExerciseLog } from '@/lib/types';

export const dynamic = 'force-dynamic';

const TYPE_META: Record<string, { label: string; icon: React.ReactNode }> = {
  walking: { label: 'सैर (Walking)', icon: <Footprints className="h-6 w-6 text-emerald-500" /> },
  yoga: { label: 'योग (Yoga)', icon: <Heart className="h-6 w-6 text-rose-500" /> },
  cycling: { label: 'साइकिल (Cycling)', icon: <Bike className="h-6 w-6 text-sky-500" /> },
  meditation: { label: 'ध्यान (Meditation)', icon: <Brain className="h-6 w-6 text-violet-500" /> },
  other: { label: 'अन्य', icon: <Dumbbell className="h-6 w-6 text-amber-500" /> },
};

export default async function ExercisePage() {
  const supabase = await createClient();
  const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString().slice(0, 10);

  const { data } = await supabase
    .from('exercise_logs')
    .select('*')
    .gte('log_date', weekAgo)
    .order('created_at', { ascending: false })
    .returns<ExerciseLog[]>();

  const logs = data ?? [];
  const today = todayStr();
  const todayLogs = logs.filter((l) => l.log_date === today);
  const todayMin = todayLogs.reduce((s, l) => s + l.duration_min, 0);
  const todayCal = todayLogs.reduce((s, l) => s + (l.calories ?? 0), 0);

  return (
    <div className="space-y-4 animate-fade-in-up">
      <h1 className="flex items-center gap-2 text-elder-xl font-bold">
        <Dumbbell className="h-8 w-8 text-amber-500" /> Exercise
      </h1>

      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-base font-semibold text-muted-foreground">आज</p>
            <p className="text-3xl font-bold tabular-nums">{todayMin}</p>
            <p className="text-sm text-muted-foreground">मिनट (लक्ष्य: 30)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-base font-semibold text-muted-foreground">Calories</p>
            <p className="text-3xl font-bold tabular-nums">{todayCal}</p>
            <p className="text-sm text-muted-foreground">आज burn हुईं</p>
          </CardContent>
        </Card>
      </div>

      <ExerciseForm />

      <Card>
        <CardHeader>
          <CardTitle>इस हफ़्ते की activity</CardTitle>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <p className="text-elder-base text-muted-foreground">
              अभी कोई activity दर्ज नहीं है। 10 मिनट की सैर से शुरुआत करें!
            </p>
          ) : (
            <ul className="space-y-2">
              {logs.map((l) => (
                <li key={l.id} className="flex items-center justify-between rounded-2xl bg-muted/50 p-3">
                  <div className="flex items-center gap-3">
                    {TYPE_META[l.exercise_type]?.icon}
                    <div>
                      <p className="text-elder-base font-semibold">
                        {TYPE_META[l.exercise_type]?.label ?? l.exercise_type}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(l.log_date + 'T00:00:00').toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                        })}
                        {' · '}
                        {l.duration_min} मिनट
                      </p>
                    </div>
                  </div>
                  <Badge variant="warning">{l.calories ?? 0} cal</Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
