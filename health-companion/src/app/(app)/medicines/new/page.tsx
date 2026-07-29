import { MedicineForm } from '@/components/medicine-form';
import { createMedicine } from '../actions';

export default function NewMedicinePage() {
  return (
    <div className="space-y-4 animate-fade-in-up">
      <h1 className="text-elder-xl font-bold">नई दवा जोड़ें</h1>
      <MedicineForm action={createMedicine} submitLabel="दवा जोड़ें ✅" />
    </div>
  );
}
