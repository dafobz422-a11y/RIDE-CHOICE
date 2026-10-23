import type { PrefKey, Preferences, Priority, Temperature, VehicleSize } from "./types";

export const PRICE_MIN = 8;
export const PRICE_MAX = 120;
export const WAIT_MIN = 2;
export const WAIT_MAX = 20;

export const DEFAULT_PREFERENCES: Preferences = {
  maxPrice: 50,
  maxWaitMin: 10,
  vehicleSize: "any",
  quiet: false,
  temperature: "neutral",
  wheelchair: false,
  eco: false,
  priority: "cheapest",
};

/** Display order for preferences everywhere in the UI. */
export const PREF_ORDER: PrefKey[] = [
  "price",
  "wait",
  "size",
  "accessible",
  "quiet",
  "temperature",
  "eco",
];

/** Hard preferences filter rides out; soft ones only affect the score. */
export const HARD_KEYS: PrefKey[] = ["price", "wait", "size", "accessible"];

export function isHard(key: PrefKey): boolean {
  return HARD_KEYS.includes(key);
}

/** Keys the rider is actually asking for. Price and wait are always active. */
export function activeKeys(p: Preferences): PrefKey[] {
  return PREF_ORDER.filter((key) => {
    switch (key) {
      case "price":
      case "wait":
        return true;
      case "size":
        return p.vehicleSize !== "any";
      case "accessible":
        return p.wheelchair;
      case "quiet":
        return p.quiet;
      case "temperature":
        return p.temperature !== "neutral";
      case "eco":
        return p.eco;
    }
  });
}

export const PREF_SHORT: Record<PrefKey, string> = {
  price: "Price",
  wait: "Pickup wait",
  size: "Vehicle size",
  accessible: "Wheelchair access",
  quiet: "Quiet ride",
  temperature: "Temperature",
  eco: "Eco vehicle",
};

export const SIZE_LABEL: Record<VehicleSize, string> = {
  any: "Any",
  standard: "Standard",
  xl: "XL",
};

export const TEMP_LABEL: Record<Temperature, string> = {
  cool: "Cool",
  neutral: "Neutral",
  warm: "Warm",
};

export const PRIORITY_LABEL: Record<Priority, string> = {
  cheapest: "Cheapest",
  fastest: "Fastest",
  comfort: "Comfort",
};

export function formatPrice(n: number): string {
  return `$${n.toFixed(2)}`;
}

/** What the rider asked for, as a short phrase ("Under $40", "Cool cabin"). */
export function describePref(key: PrefKey, p: Preferences): string {
  switch (key) {
    case "price":
      return `Up to $${p.maxPrice}`;
    case "wait":
      return `Pickup within ${p.maxWaitMin} min`;
    case "size":
      return p.vehicleSize === "xl" ? "XL vehicle" : "Standard car";
    case "accessible":
      return "Wheelchair accessible";
    case "quiet":
      return "Quiet ride";
    case "temperature":
      return `${TEMP_LABEL[p.temperature]} cabin`;
    case "eco":
      return "EV or hybrid";
  }
}
