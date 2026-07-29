import Link from 'next/link';
import { AlertTriangle, Pill, Plus, Utensils } from 'lucide-react';
import { requireProfile } from '@/lib/auth';
import { ensureTodayLogs } from '@/lib/medicine-schedule';
import { formatTime12, slotLabel, todayStr, SLOT_TIMES } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { MedicineTakenButton } from '@/components/medicine-taken-button';
import { ArchiveMedicineButton } from './archive-button';
import type { Medicine, MedicineLog } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function MedicinesPage() {
  await ensureTodayLogs();
  const { supabase, isCaregiver } = await requireProfile();
  const today = todayStr();

  const [{ data: medicines }, { data: logs }] = await Promise.all([
    supabase.from('medicines').select('*').eq('archived', false).order('created_at'),
    supabase.from('medicine_logs').select('*').eq('log_date', today),
  ]);

  const meds = (medicines ?? []) as Medicine[];
  const logByKey = new Map(
    ((logs ?? []) as MedicineLog[]).map((l) => [`${l.medicine_id}:${l.slot}`, l])
  );

  return (
    <div className="space-y-4 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-elder-xl font-bold">
          <Pill className="h-8 w-8 text-primary" /> दवाइयाँ
        </h1>
        {isCaregiver && (
          <Link href="/medicines/new">
            <Button size="lg">
              <Plus className="h-6 w-6" /> नई दवा
            </Button>
          </Link>
        )}
      </div>

      {meds.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center text-elder-base text-muted-foreground">
            अभी कोई दवा नहीं जोड़ी गई है।
            {isCaregiver && ' ऊपर "नई दवा" दबाकर शुरू करें।'}
          </CardContent>
        </Card>
      )}

      {meds.map((med) => {
        const lowStock =
          med.stock_count !== null && med.stock_count <= med.low_stock_threshold;
        return (
          <Card
            key={med.id}
            className="overflow-hidden"
            style={{ borderLeftWidth: 8, borderLeftColor: med.color_tag }}
          >
            <CardContent className="space-y-3 p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-elder-lg font-bold">{med.name}</p>
                  <p className="text-base text-muted-foreground">
                    {med.quantity}
                    {med.doctor_name && ` · Dr. ${med.doctor_name}`}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Badge variant="muted">
                    <Utensils className="h-4 w-4" />
                    {med.food_relation === 'before_food'
                      ? 'खाने से पहले'
                      : med.food_relation === 'after_food'
                        ? 'खाने के बाद'
                        : 'कभी भी'}
                  </Badge>
                  {lowStock && (
                    <Badge variant="warning">
                      <AlertTriangle className="h-4 w-4" /> केवल {med.stock_count} बची हैं
                    </Badge>
                  )}
                </div>
              </div>

              <ul className="space-y-2">
                {med.slots.map((slot) => {
                  const log = logByKey.get(`${med.id}:${slot}`);
                  const time =
                    slot === 'custom'
                      ? (med.custom_time ?? '12:00').slice(0, 5)
                      : SLOT_TIMES[slot];
                  return (
                    <li
                      key={slot}
                      className="flex items-center justify-between gap-2 rounded-2xl bg-muted/50 p-3"
                    >
                      <p className="text-elder-base font-semibold">
                        {slotLabel(slot)} · {formatTime12(time)}
                      </p>
                      {log ? (
                        <MedicineTakenButton logId={log.id} taken={log.taken} />
                      ) : (
                        <Badge variant="muted">आज शेड्यूल नहीं</Badge>
                      )}
                    </li>
                  );
                })}
              </ul>

              {med.notes && (
                <p className="rounded-2xl bg-primary/5 p-3 text-base text-muted-foreground">
                  📝 {med.notes}
                </p>
              )}

              {isCaregiver && (
                <div className="flex gap-2">
                  <Link href={`/medicines/${med.id}/edit`} className="flex-1">
                    <Button variant="outline" className="w-full" size="sm">
                      Edit करें
                    </Button>
                  </Link>
                  <ArchiveMedicineButton id={med.id} />
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
