import { createAdminClient } from './supabase/admin';

const GRAPH_URL = 'https://graph.facebook.com/v21.0';

interface SendResult {
  success: boolean;
  response: unknown;
}

function maytapiConfig() {
  const productId = process.env.MAYTAPI_PRODUCT_ID;
  const phoneId = process.env.MAYTAPI_PHONE_ID;
  const key = process.env.MAYTAPI_KEY;
  return productId && phoneId && key ? { productId, phoneId, key } : null;
}

function metaConfig() {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  return token && phoneNumberId ? { token, phoneNumberId } : null;
}

/**
 * Send a WhatsApp text message and log the attempt. Uses Maytapi when its
 * env vars are set, otherwise the Meta Cloud API, otherwise it no-ops with a
 * log row. The Settings toggle can disable all sends.
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

  const maytapi = maytapiConfig();
  const meta = metaConfig();

  if (!toNumber || (!maytapi && !meta) || settings?.whatsapp_enabled === false) {
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
    if (maytapi) {
      const res = await fetch(
        `https://api.maytapi.com/api/${maytapi.productId}/${maytapi.phoneId}/sendMessage`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-maytapi-key': maytapi.key,
          },
          body: JSON.stringify({ to_number: toNumber, type: 'text', message }),
        }
      );
      const json = (await res.json()) as { success?: boolean };
      response = { provider: 'maytapi', ...json };
      success = res.ok && json.success !== false;
    } else if (meta) {
      const res = await fetch(`${GRAPH_URL}/${meta.phoneNumberId}/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${meta.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: toNumber,
          type: 'text',
          text: { body: message },
        }),
      });
      response = { provider: 'meta', ...(await res.json()) };
      success = res.ok;
    }
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

/**
 * Papa's WhatsApp number: read from the patient profile in the database
 * (editable without redeploys), falling back to the PATIENT_WHATSAPP_NUMBER
 * env var. Digits-only or undefined when unset.
 */
export async function patientNumber(): Promise<string | undefined> {
  const admin = createAdminClient();
  const { data } = await admin
    .from('profiles')
    .select('phone')
    .eq('role', 'patient')
    .not('phone', 'is', null)
    .limit(1)
    .maybeSingle();
  const digits = (data?.phone ?? process.env.PATIENT_WHATSAPP_NUMBER ?? '').replace(/\D/g, '');
  return digits.length >= 10 ? digits : undefined;
}

export const caregiverNumber = () => process.env.CAREGIVER_WHATSAPP_NUMBER;

/**
 * Every alert recipient: all family members' numbers plus the
 * CAREGIVER_WHATSAPP_NUMBER env fallback. Digits-only, deduplicated.
 */
export async function alertNumbers(): Promise<string[]> {
  const admin = createAdminClient();
  const { data } = await admin.from('family_members').select('phone');
  const numbers = new Set<string>();
  const envNumber = caregiverNumber();
  if (envNumber) numbers.add(envNumber.replace(/\D/g, ''));
  for (const row of data ?? []) {
    const digits = (row.phone ?? '').replace(/\D/g, '');
    if (digits.length >= 10) numbers.add(digits);
  }
  return [...numbers];
}

/** Send the same message to every alert recipient (family + caregiver). */
export async function sendWhatsAppToFamily(message: string, category: string): Promise<void> {
  const numbers = await alertNumbers();
  for (const number of numbers) {
    await sendWhatsApp(number, message, category);
  }
}

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
