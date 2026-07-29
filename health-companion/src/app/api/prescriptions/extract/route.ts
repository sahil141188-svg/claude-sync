import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { extractPrescriptionFromImage } from '@/lib/ai';

export const maxDuration = 60;

/**
 * POST { prescriptionId }
 * Downloads the uploaded file from Supabase Storage, runs AI OCR extraction,
 * stores the extracted medicines and returns them.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { prescriptionId } = await request.json();
  if (!prescriptionId) {
    return NextResponse.json({ error: 'prescriptionId required' }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: prescription } = await admin
    .from('prescription_files')
    .select('*')
    .eq('id', prescriptionId)
    .single();
  if (!prescription) {
    return NextResponse.json({ error: 'Prescription not found' }, { status: 404 });
  }

  const { data: file, error: dlError } = await admin.storage
    .from('prescriptions')
    .download(prescription.file_path);
  if (dlError || !file) {
    return NextResponse.json({ error: 'Could not download file' }, { status: 500 });
  }

  const base64 = Buffer.from(await file.arrayBuffer()).toString('base64');

  try {
    const extracted = await extractPrescriptionFromImage(base64, prescription.file_type);

    const rows = extracted.medicines.map((m) => ({
      prescription_id: prescriptionId,
      name: m.name,
      morning: m.morning,
      afternoon: m.afternoon,
      night: m.night,
      dose: m.dose,
      duration_days: m.duration_days,
    }));

    // Re-running extraction replaces previous results for this prescription.
    await admin.from('extracted_medicines').delete().eq('prescription_id', prescriptionId);
    if (rows.length) await admin.from('extracted_medicines').insert(rows);

    await admin
      .from('prescription_files')
      .update({
        ocr_done: true,
        doctor_name: extracted.doctor_name ?? prescription.doctor_name,
        prescribed_on: extracted.prescribed_on ?? prescription.prescribed_on,
      })
      .eq('id', prescriptionId);

    return NextResponse.json({ extracted });
  } catch (err) {
    return NextResponse.json(
      { error: `AI extraction failed: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 }
    );
  }
}
