import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const APP_TZ = process.env.APP_TIMEZONE || 'Asia/Kolkata';

/** Current Date parts in the app timezone (safe on Vercel where server TZ is UTC). */
export function nowInAppTz(): Date {
  return new Date(new Date().toLocaleString('en-US', { timeZone: APP_TZ }));
}

/** yyyy-MM-dd for "today" in the app timezone. */
export function todayStr(): string {
  const d = nowInAppTz();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export type TimeOfDay = 'morning' | 'afternoon' | 'night';

export function timeOfDay(d: Date = nowInAppTz()): TimeOfDay {
  const h = d.getHours();
  if (h < 12) return 'morning';
  if (h < 18) return 'afternoon';
  return 'night';
}

export const SLOT_TIMES: Record<string, string> = {
  morning: '08:00',
  afternoon: '13:30',
  night: '21:00',
};

export function slotLabel(slot: string, lang: 'hi' | 'en' = 'hi'): string {
  const labels: Record<string, [string, string]> = {
    morning: ['सुबह', 'Morning'],
    afternoon: ['दोपहर', 'Afternoon'],
    night: ['रात', 'Night'],
    custom: ['समय', 'Custom'],
  };
  const l = labels[slot] ?? [slot, slot];
  return lang === 'hi' ? l[0] : l[1];
}

export function formatTime12(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, '0')} ${suffix}`;
}

export function calcBmi(weightKg: number, heightCm?: number | null): number | null {
  if (!heightCm || heightCm <= 0) return null;
  const m = heightCm / 100;
  return Math.round((weightKg / (m * m)) * 10) / 10;
}

/** Days covered by an analytics range tab. Server-safe (see RangeTabs). */
export function rangeDays(range: string): number {
  return { daily: 1, weekly: 7, monthly: 30, yearly: 365 }[range] ?? 7;
}

/** Deterministic index for "item of the day" pickers. */
export function dayIndex(listLength: number, offset = 0): number {
  const days = Math.floor(Date.now() / 86_400_000);
  return (days + offset) % listLength;
}
