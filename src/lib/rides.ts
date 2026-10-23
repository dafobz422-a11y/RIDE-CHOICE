import type { Driver, FareBreakdown, Powertrain, RideOption, Tier, Vehicle } from "./types";

/** FNV-1a string hash → 32-bit seed. */
export function hashString(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** mulberry32: small, fast, deterministic PRNG returning [0, 1). */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function normalizeAddress(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

interface TierSpec {
  tier: Tier;
  multiplier: number;
  eta: [number, number];
  size: Vehicle["size"];
  seats: number;
  powertrain: (r: number) => Powertrain;
  quiet: (r: number) => boolean;
  climate: (r: number) => boolean;
  wheelchair: boolean;
  /** Higher is more comfortable; used for the "comfort" priority. */
  comfort: number;
  cars: [string, string][];
}

export const TIERS: TierSpec[] = [
  {
    tier: "Economy",
    multiplier: 1,
    eta: [2, 7],
    size: "standard",
    seats: 4,
    powertrain: (r) => (r < 0.45 ? "hybrid" : "gas"),
    quiet: (r) => r < 0.35,
    climate: (r) => r < 0.5,
    wheelchair: false,
    comfort: 1,
    cars: [["Toyota", "Corolla"], ["Honda", "Civic"], ["Hyundai", "Elantra"]],
  },
  {
    tier: "Comfort",
    multiplier: 1.35,
    eta: [3, 9],
    size: "standard",
    seats: 4,
    powertrain: (r) => (r < 0.5 ? "hybrid" : "gas"),
    quiet: () => true,
    climate: () => true,
    wheelchair: false,
    comfort: 3,
    cars: [["Toyota", "Camry"], ["Honda", "Accord"], ["Kia", "K5"]],
  },
  {
    tier: "XL",
    multiplier: 1.6,
    eta: [4, 11],
    size: "xl",
    seats: 6,
    powertrain: (r) => (r < 0.3 ? "hybrid" : "gas"),
    quiet: (r) => r < 0.4,
    climate: () => true,
    wheelchair: false,
    comfort: 2,
    cars: [["Toyota", "Highlander"], ["Honda", "Odyssey"], ["Kia", "Telluride"]],
  },
  {
    tier: "Green EV",
    multiplier: 1.15,
    eta: [3, 10],
    size: "standard",
    seats: 4,
    powertrain: () => "ev",
    quiet: () => true,
    climate: (r) => r < 0.8,
    wheelchair: false,
    comfort: 2,
    cars: [["Tesla", "Model 3"], ["Hyundai", "Ioniq 6"], ["Polestar", "2"]],
  },
  {
    tier: "Access",
    multiplier: 1.2,
    eta: [5, 16],
    size: "xl",
    seats: 5,
    powertrain: (r) => (r < 0.35 ? "hybrid" : "gas"),
    quiet: (r) => r < 0.5,
    climate: () => true,
    wheelchair: true,
    comfort: 2,
    cars: [["Toyota", "Sienna"], ["Chrysler", "Pacifica"], ["Ford", "Transit Connect"]],
  },
  {
    tier: "Premium",
    multiplier: 2.3,
    eta: [4, 12],
    size: "standard",
    seats: 4,
    powertrain: (r) => (r < 0.4 ? "hybrid" : r < 0.6 ? "ev" : "gas"),
    quiet: () => true,
    climate: () => true,
    wheelchair: false,
    comfort: 4,
    cars: [["Mercedes-Benz", "E-Class"], ["BMW", "5 Series"], ["Lexus", "ES"]],
  },
];

export const TIER_COMFORT: Record<Tier, number> = Object.fromEntries(
  TIERS.map((t) => [t.tier, t.comfort]),
) as Record<Tier, number>;

const FIRST_NAMES = [
  "Amara", "Diego", "Priya", "Kwame", "Sofia", "Hiro", "Leila", "Mateo",
  "Nia", "Omar", "Ingrid", "Tomás", "Yara", "Chen", "Femi", "Ana",
];
const LAST_INITIALS = "ABCDEFGHJKLMNPRSTW";
const COLORS = ["Black", "White", "Silver", "Gray", "Blue", "Red", "Green"];

function pick<T>(r: () => number, list: readonly T[]): T {
  return list[Math.floor(r() * list.length)];
}

function between(r: () => number, [lo, hi]: [number, number]): number {
  return lo + Math.floor(r() * (hi - lo + 1));
}

function plate(r: () => number): string {
  const letters = "ABCDEFGHJKLMNPRSTUVWXYZ";
  let s = "";
  for (let i = 0; i < 3; i++) s += pick(r, letters.split(""));
  return `${s}-${String(between(r, [100, 999]))}`;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

const BASE_FARE = 2.5;
const PER_KM = 0.95;
const PER_MIN = 0.26;
const BOOKING_FEE = 1.75;

/** Unscored ride options; `meets`/`matchScore` are filled in by matching. */
export function generateOptions(pickup: string, dropoff: string): RideOption[] {
  const seed = hashString(`${normalizeAddress(pickup)}→${normalizeAddress(dropoff)}`);
  const r = seededRandom(seed);
  const distanceKm = 3 + r() * 19; // 3–22 km
  const baseDuration = Math.round(distanceKm * 2.1 + 4 + r() * 6);
  const routeFare = BASE_FARE + PER_KM * distanceKm + PER_MIN * baseDuration;

  return TIERS.map((spec, index) => {
    const [make, model] = pick(r, spec.cars);
    const driver: Driver = {
      name: `${pick(r, FIRST_NAMES)} ${pick(r, LAST_INITIALS.split(""))}.`,
      rating: Math.round((4.6 + r() * 0.4) * 100) / 100,
      trips: between(r, [120, 6400]),
    };
    const vehicle: Vehicle = {
      make,
      model,
      color: pick(r, COLORS),
      plate: plate(r),
      size: spec.size,
      seats: spec.seats,
      powertrain: spec.powertrain(r()),
    };
    const jitter = 0.94 + r() * 0.12;
    // Itemised so the rider can see where the price comes from; lines sum to the price.
    const fare: FareBreakdown = {
      base: round2(BASE_FARE),
      distance: round2(PER_KM * distanceKm),
      time: round2(PER_MIN * baseDuration),
      tier: round2(routeFare * spec.multiplier * jitter - routeFare),
      fee: BOOKING_FEE,
    };
    const price = round2(fare.base + fare.distance + fare.time + fare.tier + fare.fee);
    // Larger vehicles drive a touch slower in this model.
    const durationMin = baseDuration + (spec.size === "xl" ? between(r, [0, 3]) : between(r, [-1, 1]));
    return {
      id: `${seed.toString(36)}-${index}`,
      tier: spec.tier,
      price,
      etaMin: between(r, spec.eta),
      durationMin: Math.max(4, durationMin),
      distanceKm: Math.round(distanceKm * 10) / 10,
      fare,
      vehicle,
      driver,
      features: {
        quietMode: spec.quiet(r()),
        climateControl: spec.climate(r()),
        wheelchairAccessible: spec.wheelchair,
      },
      meets: {},
      matchScore: 0,
    };
  });
}

export const SAMPLE_ADDRESSES = [
  "Union Station, 50 Front St",
  "City Hall, 100 Main St",
  "Riverside Park, 400 River Rd",
  "Airport Terminal 1",
  "Central Library, 22 Elm Ave",
  "Harbor Market, 9 Pier Way",
] as const;

/** Rider-facing description of each tier, for the Home carousel. */
export const TIER_INFO: Record<Tier, { tagline: string; perks: string[] }> = {
  Economy: { tagline: "Everyday rides at the best price", perks: ["4 seats", "Often hybrid", "Fastest pickups"] },
  Comfort: { tagline: "Newer cars, quiet by default", perks: ["Quiet mode", "Climate control", "Extra legroom"] },
  XL: { tagline: "Room for six and luggage", perks: ["6 seats", "Large boot", "Climate control"] },
  "Green EV": { tagline: "All-electric, whisper quiet", perks: ["Zero tailpipe", "Quiet mode", "4 seats"] },
  Access: { tagline: "Ramp-equipped, trained drivers", perks: ["Wheelchair ramp", "5 seats", "Assistance on request"] },
  Premium: { tagline: "Executive cars, top-rated drivers", perks: ["Luxury sedan", "Quiet mode", "Top drivers"] },
};
