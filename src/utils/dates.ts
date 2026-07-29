// Local-timezone calendar dates as YYYY-MM-DD.
// toISOString() must never be used for calendar dates: it converts to UTC,
// which lands on the previous day for timezones east of UTC (IST = UTC+5:30).

export function fmtLocalDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function todayLocal(): string {
  return fmtLocalDate(new Date())
}
