import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function TestQuery() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('sugar_readings')
    .select('*')
    .order('measured_at');
  return (
    <p>
      v-query ok (rows: {data?.length ?? 'null'}, error: {error?.message ?? 'none'})
    </p>
  );
}
