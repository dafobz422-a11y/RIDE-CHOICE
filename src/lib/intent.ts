/** One-shot hint from Home to the booking screen ("open in Schedule mode"). */
export type BookingIntent = "now" | "schedule";

const KEY = "ridechoice:intent";

export function setIntent(intent: BookingIntent): void {
  try {
    sessionStorage.setItem(KEY, intent);
  } catch {
    /* storage unavailable: the booking screen just opens in its default mode */
  }
}

export function takeIntent(): BookingIntent | null {
  try {
    const v = sessionStorage.getItem(KEY);
    sessionStorage.removeItem(KEY);
    return v === "now" || v === "schedule" ? v : null;
  } catch {
    return null;
  }
}
