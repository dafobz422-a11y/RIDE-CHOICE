import type { PrefAnswer, PrefKey, Rating } from "./types";

export interface RatingSummary {
  met: number;
  partly: number;
  missed: number;
  total: number;
  /** e.g. "Met 5 of 6 preferences" */
  label: string;
}

export function summarizeRating(
  perPreference: Rating["perPreference"],
  keys: PrefKey[],
): RatingSummary {
  let met = 0;
  let partly = 0;
  let missed = 0;
  for (const key of keys) {
    const a = perPreference[key];
    if (a === "yes") met++;
    else if (a === "partly") partly++;
    else if (a === "no") missed++;
  }
  const total = keys.length;
  const noun = total === 1 ? "preference" : "preferences";
  return { met, partly, missed, total, label: `Met ${met} of ${total} ${noun}` };
}

export function isRatingComplete(
  perPreference: Rating["perPreference"],
  keys: PrefKey[],
  stars: number,
): boolean {
  return keys.every((k) => perPreference[k] !== undefined) && stars >= 1 && stars <= 5;
}

export const ANSWER_LABEL: Record<PrefAnswer, string> = {
  yes: "Yes",
  partly: "Partly",
  no: "No",
};

export interface HistoryStats {
  rides: number;
  rated: number;
  /** Mean stars over rated rides, or null when none are rated. */
  avgStars: number | null;
  /** Share of snapshotted preferences answered "yes", 0–100, or null. */
  metPct: number | null;
}

export function historyStats(items: { activeKeys: PrefKey[]; rating: Rating | null }[]): HistoryStats {
  let rated = 0;
  let stars = 0;
  let met = 0;
  let total = 0;
  for (const { activeKeys, rating } of items) {
    if (!rating) continue;
    rated++;
    stars += rating.stars;
    const s = summarizeRating(rating.perPreference, activeKeys);
    met += s.met;
    total += s.total;
  }
  return {
    rides: items.length,
    rated,
    avgStars: rated ? Math.round((stars / rated) * 10) / 10 : null,
    metPct: total ? Math.round((met / total) * 100) : null,
  };
}
