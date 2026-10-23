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

export interface TripProgress {
  stage: BookingStatus;
  /** 0–1 within the current stage (1 once completed). */
  fraction: number;
  /** Whole seconds left in the current stage (0 once completed). */
  secondsLeft: number;
}

/** Continuous progress for animating the trip; agrees with `stageAt`. */
export function tripProgress(startedAt: string, now: number, stored: BookingStatus): TripProgress {
  const stage = stageAt(startedAt, now, stored);
  if (stage === "completed") return { stage, fraction: 1, secondsLeft: 0 };
  const elapsed = Math.max(0, now - Date.parse(startedAt));
  const stageStart = STAGES.indexOf(stage) * STAGE_MS;
  const within = Math.min(STAGE_MS, Math.max(0, elapsed - stageStart));
  return { stage, fraction: within / STAGE_MS, secondsLeft: Math.ceil((STAGE_MS - within) / 1000) };
}
