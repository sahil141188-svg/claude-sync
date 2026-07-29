import { Lightbulb } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { tipOfTheDay } from '@/lib/tips';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const dynamic = 'force-dynamic';

export default async function TipsPage() {
  const supabase = await createClient();
  const { data: history } = await supabase
    .from('health_tips')
    .select('*')
    .order('tip_date', { ascending: false })
    .limit(14);

  const tip = tipOfTheDay();

  return (
    <div className="space-y-4 animate-fade-in-up">
      <h1 className="flex items-center gap-2 text-elder-xl font-bold">
        <Lightbulb className="h-8 w-8 text-amber-500" /> Health Tips
      </h1>

      <Card className="border-amber-400/40 bg-amber-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            आज की सलाह <Badge variant="warning">{tip.topic}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-elder-lg">{tip.hi}</p>
          <p className="mt-2 text-base text-muted-foreground">{tip.en}</p>
        </CardContent>
      </Card>

      {(history ?? []).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>पिछली सलाहें</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {(history ?? []).map((h) => (
                <li key={h.id} className="rounded-2xl bg-muted/50 p-3">
                  <p className="text-sm font-semibold text-muted-foreground">
                    {new Date(h.tip_date + 'T00:00:00').toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'long',
                    })}
                    {' · '}
                    {h.topic}
                  </p>
                  <p className="text-elder-base">{h.tip_hi}</p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
