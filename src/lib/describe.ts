import { formatPrice } from "./prefs";
import type { PrefKey, RideOption } from "./types";

const POWERTRAIN: Record<RideOption["vehicle"]["powertrain"], string> = {
  ev: "Electric",
  hybrid: "Hybrid",
  gas: "Gas",
};

/** What a ride offers for a given preference, in a few words. */
export function describeOffer(key: PrefKey, o: RideOption): string {
  switch (key) {
    case "price":
      return formatPrice(o.price);
    case "wait":
      return `${o.etaMin} min pickup`;
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
