import { activeKeys, isHard } from "./prefs";
import { TIER_COMFORT } from "./rides";
import type { PrefKey, Preferences, Priority, RideOption } from "./types";

export function meetsPreference(o: RideOption, key: PrefKey, p: Preferences): boolean {
  switch (key) {
    case "price":
      return o.price <= p.maxPrice;
    case "wait":
      return o.etaMin <= p.maxWaitMin;
    case "size":
      return p.vehicleSize === "any" || o.vehicle.size === p.vehicleSize;
    case "accessible":
      return !p.wheelchair || o.features.wheelchairAccessible;
    case "quiet":
      return !p.quiet || o.features.quietMode;
    case "temperature":
      return p.temperature === "neutral" || o.features.climateControl;
    case "eco":
      return !p.eco || o.vehicle.powertrain !== "gas";
  }
}

/** Fill in `meets` (active keys only) and `matchScore` (count of met keys). */
export function evaluate(o: RideOption, p: Preferences): RideOption {
  const meets: Partial<Record<PrefKey, boolean>> = {};
  let score = 0;
  for (const key of activeKeys(p)) {
    const ok = meetsPreference(o, key, p);
    meets[key] = ok;
    if (ok) score++;
  }
  return { ...o, meets, matchScore: score };
}

export function failedHardKeys(o: RideOption): PrefKey[] {
  return (Object.keys(o.meets) as PrefKey[]).filter((k) => isHard(k) && o.meets[k] === false);
}

export function isEligible(o: RideOption): boolean {
  return failedHardKeys(o).length === 0;
}

export function totalTime(o: RideOption): number {
  return o.etaMin + o.durationMin;
}

export function compareByPriority(priority: Priority) {
  return (a: RideOption, b: RideOption): number => {
    const byPrice = a.price - b.price;
    const byTime = totalTime(a) - totalTime(b);
    const byComfort = TIER_COMFORT[b.tier] - TIER_COMFORT[a.tier];
    const byScore = b.matchScore - a.matchScore;
    const chain =
      priority === "cheapest"
        ? [byPrice, byScore, byTime]
        : priority === "fastest"
          ? [byTime, byScore, byPrice]
          : [byComfort, byScore, b.driver.rating - a.driver.rating, byPrice];
    for (const d of chain) if (d !== 0) return d;
    return a.id.localeCompare(b.id);
  };
}

/** How far an option misses the hard preferences, for ranking near misses. */
export function missDistance(o: RideOption, p: Preferences): number {
  let d = failedHardKeys(o).length * 10;
  if (o.price > p.maxPrice) d += (o.price - p.maxPrice) / p.maxPrice;
  if (o.etaMin > p.maxWaitMin) d += (o.etaMin - p.maxWaitMin) / p.maxWaitMin;
  return d;
}

export type Badge = "Best match" | "Cheapest" | "Fastest";

export interface ShownOption {
  option: RideOption;
  eligible: boolean;
  failed: PrefKey[];
  badges: Badge[];
}

export interface Selection {
  shown: ShownOption[];
  eligibleCount: number;
}

export const MIN_SHOWN = 3;
export const MAX_SHOWN = 4;

/**
 * Score every option, keep the eligible ones sorted by priority (max 4), and if
 * fewer than 3 qualify pad with the nearest misses so the rider can compare.
 */
export function selectOptions(raw: RideOption[], p: Preferences): Selection {
  const scored = raw.map((o) => evaluate(o, p));
  const cmp = compareByPriority(p.priority);
  const eligible = scored.filter(isEligible).sort(cmp);
  const misses = scored
    .filter((o) => !isEligible(o))
    .sort((a, b) => missDistance(a, p) - missDistance(b, p) || cmp(a, b));

  const picked = eligible.slice(0, MAX_SHOWN);
  const padding = misses.slice(0, Math.max(0, MIN_SHOWN - picked.length));

  const shown: ShownOption[] = [
    ...picked.map((option) => ({ option, eligible: true, failed: [], badges: [] as Badge[] })),
    ...padding.map((option) => ({
      option,
      eligible: false,
      failed: failedHardKeys(option),
      badges: [] as Badge[],
    })),
  ];
  assignBadges(shown);
  return { shown, eligibleCount: eligible.length };
}

/** Badges go to eligible options only; ties resolve to the earlier (higher-sorted) one. */
export function assignBadges(shown: ShownOption[]): void {
  const pool = shown.filter((s) => s.eligible);
  if (pool.length === 0) return;
  const best = (score: (s: ShownOption) => number) =>
    pool.reduce((acc, s) => (score(s) < score(acc) ? s : acc));
  best((s) => -s.option.matchScore).badges.push("Best match");
  best((s) => s.option.price).badges.push("Cheapest");
  best((s) => totalTime(s.option)).badges.push("Fastest");
}
