import { createAdminClient } from './supabase/admin';

const GRAPH_URL = 'https://graph.facebook.com/v21.0';

interface SendResult {
  success: boolean;
  response: unknown;
}

/**
 * Send a WhatsApp text message via the Meta Cloud API and log the attempt.
 * Silently no-ops (with a log row) when WhatsApp is not configured or disabled.
 */
export async function sendWhatsApp(
  toNumber: string | undefined,
  message: string,
  category = 'general'
): Promise<SendResult> {
  const admin = createAdminClient();

  const { data: settings } = await admin
    .from('hc_app_settings')
    .select('whatsapp_enabled')
    .eq('id', 1)
    .single();

  const token = process.env.WHATSAPP_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!toNumber || !token || !phoneNumberId || settings?.whatsapp_enabled === false) {
    await admin.from('whatsapp_logs').insert({
      to_number: toNumber ?? 'unconfigured',
      message,
      category,
      success: false,
      provider_response: { skipped: true, reason: 'whatsapp disabled or not configured' },
    });
    return { success: false, response: { skipped: true } };
  }

  let response: unknown = null;
  let success = false;
  try {
    const res = await fetch(`${GRAPH_URL}/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: toNumber,
        type: 'text',
        text: { body: message },
      }),
    });
    response = await res.json();
    success = res.ok;
  } catch (err) {
    response = { error: String(err) };
  }

  await admin.from('whatsapp_logs').insert({
    to_number: toNumber,
    message,
    category,
    success,
    provider_response: response,
  });

  return { success, response };
}

export const patientNumber = () => process.env.PATIENT_WHATSAPP_NUMBER;
export const caregiverNumber = () => process.env.CAREGIVER_WHATSAPP_NUMBER;

export function medicineReminderMessage(medicineName: string, slotHi: string): string {
  return (
    `Namaste Papa ❤️\n\n` +
    `Aapki ${slotHi} ki medicine "${medicineName}" lene ka time ho gaya hai.\n` +
    `Please medicine le lijiye aur app mein ✅ Taken daba dijiye.\n\n` +
    `Stay healthy ❤️`
  );
}

export function missedMedicineAlert(medicineName: string, slotHi: string): string {
  return (
    `⚠️ Alert: Papa ne abhi tak ${slotHi} ki medicine "${medicineName}" nahi li hai ` +
    `(90+ minute ho gaye). Please unhe call kar lijiye.`
  );
}
