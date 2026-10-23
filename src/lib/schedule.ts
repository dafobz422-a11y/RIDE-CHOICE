/** Scheduling rules and formatting. All times are the rider's local time. */

export const MIN_LEAD_MIN = 30;
export const SLOT_MIN = 30;
export const DAYS_AHEAD = 7;
/** Shown to riders: when a driver gets assigned for a scheduled ride. */
export const ASSIGN_BEFORE_MIN = 15;

export type DayPart = "morning" | "afternoon" | "evening";

export const DAY_PARTS: { id: DayPart; label: string; from: number; to: number }[] = [
  { id: "morning", label: "Morning", from: 5, to: 12 },
  { id: "afternoon", label: "Afternoon", from: 12, to: 17 },
  { id: "evening", label: "Evening", from: 17, to: 24 },
];

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export function earliestPickup(now: Date): Date {
  return new Date(now.getTime() + MIN_LEAD_MIN * 60_000);
}

/** Bookable pickup slots for one day part, never earlier than now + lead time. */
export function slotsFor(day: Date, part: DayPart, now: Date): Date[] {
  const spec = DAY_PARTS.find((p) => p.id === part)!;
  const earliest = earliestPickup(now).getTime();
  const out: Date[] = [];
  for (let minutes = spec.from * 60; minutes < spec.to * 60; minutes += SLOT_MIN) {
    const slot = startOfDay(day);
    slot.setMinutes(minutes);
    if (slot.getTime() >= earliest) out.push(slot);
  }
  return out;
}

export function slotsForDay(day: Date, now: Date): Date[] {
  return DAY_PARTS.flatMap((p) => slotsFor(day, p.id, now));
}

/** The next DAYS_AHEAD days that still have at least one bookable slot. */
export function scheduleDays(now: Date): Date[] {
  const today = startOfDay(now);
  return Array.from({ length: DAYS_AHEAD + 1 }, (_, i) => addDays(today, i))
    .filter((d) => slotsForDay(d, now).length > 0)
    .slice(0, DAYS_AHEAD);
}

export function isValidSchedule(iso: string, now: Date): boolean {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return false;
  // One minute of grace so a slot picked just before the cutoff still counts.
  const earliest = earliestPickup(now).getTime() - 60_000;
  const latest = addDays(startOfDay(now), DAYS_AHEAD + 1).getTime();
  return t >= earliest && t < latest;
}

export function formatTime(d: Date): string {
  const h = d.getHours();
  const m = d.getMinutes();
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}

export function dayLabel(day: Date, now: Date): string {
  const diff = Math.round((startOfDay(day).getTime() - startOfDay(now).getTime()) / 86_400_000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  return `${WEEKDAYS[day.getDay()]} ${day.getDate()} ${MONTHS[day.getMonth()]}`;
}

/** "Today, 5:30 PM", "Tomorrow, 9:00 AM", "Fri 24 Oct, 9:00 AM". */
export function formatSchedule(iso: string, now: Date): string {
  const d = new Date(iso);
  return `${dayLabel(d, now)}, ${formatTime(d)}`;
}

/** "in 45 min", "in 3 h 20 min", "in 2 days". Past times read "now". */
export function timeUntil(iso: string, now: Date): string {
  const mins = Math.round((Date.parse(iso) - now.getTime()) / 60_000);
  if (mins <= 0) return "now";
  if (mins < 60) return `in ${mins} min`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `in ${h} h${mins % 60 ? ` ${mins % 60} min` : ""}`;
  const days = Math.floor(h / 24);
  const rest = h % 24;
  return `in ${days} day${days === 1 ? "" : "s"}${rest ? ` ${rest} h` : ""}`;
}

export function calendarTile(iso: string): { month: string; day: string; weekday: string } {
  const d = new Date(iso);
  return { month: MONTHS[d.getMonth()].toUpperCase(), day: String(d.getDate()), weekday: WEEKDAYS[d.getDay()] };
}

function icsDate(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function icsEscape(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

/** A minimal iCalendar event for a scheduled pickup. */
export function buildIcs(e: {
  id: string;
  start: string;
  durationMin: number;
  title: string;
  location: string;
  description: string;
  now: Date;
}): string {
  const start = new Date(e.start);
  const end = new Date(start.getTime() + e.durationMin * 60_000);
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//RideChoice//Scheduled ride//EN",
    "BEGIN:VEVENT",
    `UID:${e.id}@ridechoice`,
    `DTSTAMP:${icsDate(e.now)}`,
    `DTSTART:${icsDate(start)}`,
    `DTEND:${icsDate(end)}`,
    `SUMMARY:${icsEscape(e.title)}`,
    `LOCATION:${icsEscape(e.location)}`,
    `DESCRIPTION:${icsEscape(e.description)}`,
    "BEGIN:VALARM",
    "TRIGGER:-PT15M",
    "ACTION:DISPLAY",
    `DESCRIPTION:${icsEscape(e.title)}`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

/** Two-line chip label: "Today" / "22 Oct", "Sat" / "24 Oct". */
export function dayChip(day: Date, now: Date): { top: string; bottom: string } {
  const label = dayLabel(day, now);
  const top = label === "Today" || label === "Tomorrow" ? label : WEEKDAYS[day.getDay()];
  return { top, bottom: `${day.getDate()} ${MONTHS[day.getMonth()]}` };
}
