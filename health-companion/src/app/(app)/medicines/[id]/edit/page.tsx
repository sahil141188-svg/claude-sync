import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { MedicineForm } from '@/components/medicine-form';
import { updateMedicine } from '../../actions';
import type { Medicine } from '@/lib/types';

export default async function EditMedicinePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: medicine } = await supabase
    .from('medicines')
    .select('*')
    .eq('id', id)
    .single<Medicine>();

  if (!medicine) notFound();

  const updateWithId = updateMedicine.bind(null, id);

  return (
    <div className="space-y-4 animate-fade-in-up">
      <h1 className="text-elder-xl font-bold">दवा edit करें</h1>
      <MedicineForm medicine={medicine} action={updateWithId} submitLabel="बदलाव सेव करें ✅" />
    </div>
  );
}
