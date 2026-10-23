import type { MatchContext } from "./matching";
import { describePref, formatPrice } from "./prefs";
import { formatSchedule } from "./schedule";
import type { Booking, PrefKey, RideOption } from "./types";

const POWERTRAIN: Record<RideOption["vehicle"]["powertrain"], string> = {
  ev: "Electric",
  hybrid: "Hybrid",
  gas: "Gas",
};

/** What a ride offers for a given preference, in a few words. */
export function describeOffer(key: PrefKey, o: RideOption, ctx: MatchContext = {}): string {
  switch (key) {
    case "price":
      return formatPrice(o.price);
    case "wait":
      return ctx.scheduled ? "Reserved, on time" : `${o.etaMin} min pickup`;
    case "size":
      return `${o.vehicle.size === "xl" ? "XL" : "Standard"} · ${o.vehicle.seats} seats`;
    case "accessible":
      return o.features.wheelchairAccessible ? "Ramp-equipped" : "Not accessible";
    case "quiet":
      return o.features.quietMode ? "Quiet mode on" : "No quiet mode";
    case "temperature":
      return o.features.climateControl ? "Climate control" : "No climate control";
    case "eco":
      return POWERTRAIN[o.vehicle.powertrain];
  }
}

export function powertrainLabel(o: RideOption): string {
  return POWERTRAIN[o.vehicle.powertrain];
}

/** What the rider asked for at booking; a scheduled ride asks for punctuality. */
export function askedFor(key: PrefKey, b: Booking, now: Date = new Date()): string {
  if (key === "wait" && b.scheduledFor) return `On-time pickup, ${formatSchedule(b.scheduledFor, now)}`;
  return describePref(key, b.preferencesSnapshot);
}
