/**
 * Normalise a phone number to E.164.
 * Numbers without a country code are treated as Indian (+91).
 * Returns null when the input cannot be a valid WhatsApp number.
 */
export function normalizePhone(raw: string | null | undefined, defaultCountryCode = '91'): string | null {
  if (!raw) return null;
  const trimmed = String(raw).trim();
  if (!trimmed) return null;

  const hasPlus = trimmed.startsWith('+');
  let digits = trimmed.replace(/\D/g, '');
  if (!digits) return null;

  if (hasPlus) return isPlausible(digits) ? `+${digits}` : null;

  // International dialling prefix, e.g. 0091 98123 45678
  if (digits.startsWith('00')) {
    digits = digits.slice(2);
    return isPlausible(digits) ? `+${digits}` : null;
  }

  // Trunk prefix, e.g. 098123 45678
  digits = digits.replace(/^0+/, '');

  if (digits.length === 10) return `+${defaultCountryCode}${digits}`;
  if (digits.length === 12 && digits.startsWith(defaultCountryCode)) return `+${digits}`;
  if (digits.length > 10 && isPlausible(digits)) return `+${digits}`;
  return null;
}

function isPlausible(digits: string): boolean {
  return digits.length >= 8 && digits.length <= 15;
}

/** WhatsApp Cloud API wants the number without the leading plus. */
export function toWaId(e164: string): string {
  return e164.replace(/^\+/, '');
}

/** Mask the middle digits for logs: +91981****678 */
export function maskPhone(e164: string | null | undefined): string {
  if (!e164) return '';
  if (e164.length < 8) return e164;
  return `${e164.slice(0, 6)}****${e164.slice(-3)}`;
}
