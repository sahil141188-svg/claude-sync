import { CalendarClock, Stethoscope } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { formatTime12, todayStr } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AppointmentForm } from './appointment-form';
import { DeleteAppointmentButton } from './delete-button';
import type { DoctorVisit, Profile } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function AppointmentsPage() {
  const supabase = await createClient();
  const today = todayStr();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user!.id)
    .single<Pick<Profile, 'role'>>();
  const isCaregiver = profile?.role === 'caregiver';

  const { data } = await supabase
    .from('doctor_visits')
    .select('*')
    .order('visit_date')
    .order('visit_time')
    .returns<DoctorVisit[]>();

  const visits = data ?? [];
  const upcoming = visits.filter((v) => v.visit_date >= today);
  const past = visits.filter((v) => v.visit_date < today).reverse().slice(0, 10);

  const fmtDate = (d: string) =>
    new Date(d + 'T00:00:00').toLocaleDateString('hi-IN', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });

  return (
    <div className="space-y-4 animate-fade-in-up">
      <h1 className="flex items-center gap-2 text-elder-xl font-bold">
        <CalendarClock className="h-8 w-8 text-primary" /> Doctor Appointments
      </h1>

      {isCaregiver && <AppointmentForm />}

      <Card>
        <CardHeader>
          <CardTitle>आने वाली appointments</CardTitle>
        </CardHeader>
        <CardContent>
          {upcoming.length === 0 ? (
            <p className="text-elder-base text-muted-foreground">
              कोई appointment नहीं है।{isCaregiver && ' ऊपर से नई जोड़ें।'}
            </p>
          ) : (
            <ul className="space-y-3">
              {upcoming.map((v) => (
                <li
                  key={v.id}
                  className="flex items-center gap-3 rounded-2xl border-2 border-primary/30 bg-primary/5 p-4"
                >
                  <Stethoscope className="h-8 w-8 shrink-0 text-primary" />
                  <div className="flex-1">
                    <p className="text-elder-base font-bold">Dr. {v.doctor_name}</p>
                    <p className="text-base text-muted-foreground">
                      {fmtDate(v.visit_date)}
                      {v.visit_time && ` · ${formatTime12(v.visit_time.slice(0, 5))}`}
                    </p>
                    {v.notes && <p className="text-sm text-muted-foreground">📝 {v.notes}</p>}
                  </div>
                  {v.visit_date === today && <Badge variant="warning">आज</Badge>}
                  {isCaregiver && <DeleteAppointmentButton id={v.id} />}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {past.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>पिछली visits</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {past.map((v) => (
                <li key={v.id} className="rounded-2xl bg-muted/50 p-3">
                  <p className="text-elder-base font-semibold">Dr. {v.doctor_name}</p>
                  <p className="text-sm text-muted-foreground">
                    {fmtDate(v.visit_date)}
                    {v.notes && ` · ${v.notes}`}
                  </p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
