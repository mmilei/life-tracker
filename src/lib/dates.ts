// ISO day helpers. All operate on local time, "YYYY-MM-DD" strings.

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function todayISO(): string {
  return toISODate(new Date());
}

export function addDays(iso: string, n: number): string {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + n);
  return toISODate(d);
}

// Sunday as the first day of the week. Returns the Sunday's ISO day.
export function weekStart(d: Date = new Date()): string {
  const s = new Date(d);
  s.setDate(s.getDate() - s.getDay()); // getDay(): Sun=0
  return toISODate(s);
}

export function isToday(iso: string): boolean {
  return iso === todayISO();
}

export function isSunday(d: Date = new Date()): boolean {
  return d.getDay() === 0;
}

// Active date locale, driven by the app language (AppStore calls setDateLocale).
// TRADEOFF: module-level var instead of threading `lang` through every date call.
// AppStore sets it during render, so every consumer re-renders with the new locale.
let locale = "es-AR";

export function setDateLocale(l: string): void {
  locale = l;
}

export function getLocale(): string {
  return locale;
}

// "12 de enero" / "January 12" — human day label (Week tab header + history).
export function formatDayLong(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString(locale, {
    day: "numeric",
    month: "long",
  });
}

// Every day of the given month as ISO strings (no leading/trailing padding).
export function monthDays(year: number, month: number): string[] {
  const days: string[] = [];
  const count = new Date(year, month + 1, 0).getDate();
  for (let i = 1; i <= count; i++) days.push(toISODate(new Date(year, month, i)));
  return days;
}
