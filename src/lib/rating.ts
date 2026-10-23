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
