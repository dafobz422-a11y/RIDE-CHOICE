import type { BookingStatus } from "./types";

export const STAGES: BookingStatus[] = ["assigned", "arriving", "on_trip", "completed"];
export const STAGE_MS = 3000;

export const STAGE_LABEL: Record<BookingStatus, string> = {
  assigned: "Driver assigned",
  arriving: "Arriving",
  on_trip: "On trip",
  completed: "Completed",
};

/** Trip stage derived from elapsed time, so progress survives a reload. */
export function stageAt(startedAt: string, now: number, stored: BookingStatus): BookingStatus {
  if (stored === "completed") return "completed";
  const elapsed = Math.max(0, now - Date.parse(startedAt));
  const index = Math.min(STAGES.length - 1, Math.floor(elapsed / STAGE_MS));
  const storedIndex = STAGES.indexOf(stored);
  return STAGES[Math.max(index, storedIndex)];
}
