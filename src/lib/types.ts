export type VehicleSize = "any" | "standard" | "xl";
export type Temperature = "cool" | "neutral" | "warm";
export type Priority = "cheapest" | "fastest" | "comfort";

/** Preferences that can be met or missed by a ride (priority only sorts). */
export type PrefKey =
  | "price"
  | "wait"
  | "size"
  | "quiet"
  | "temperature"
  | "accessible"
  | "eco";

export interface Preferences {
  maxPrice: number;
  maxWaitMin: number;
  vehicleSize: VehicleSize;
  quiet: boolean;
  temperature: Temperature;
  wheelchair: boolean;
  eco: boolean;
  priority: Priority;
}

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  salt: string;
  onboarded: boolean;
  createdAt: string;
}

/** User without credential material, safe to hand to UI. */
export type PublicUser = Omit<User, "passwordHash" | "salt">;

export interface Session {
  userId: string;
  createdAt: string;
}

export type Tier =
  | "Economy"
  | "Comfort"
  | "XL"
  | "Green EV"
  | "Access"
  | "Premium";

export type Powertrain = "gas" | "hybrid" | "ev";

export interface Vehicle {
  make: string;
  model: string;
  color: string;
  plate: string;
  size: Exclude<VehicleSize, "any">;
  seats: number;
  powertrain: Powertrain;
}

export interface Driver {
  name: string;
  rating: number;
  trips: number;
}

export interface RideFeatures {
  quietMode: boolean;
  climateControl: boolean;
  wheelchairAccessible: boolean;
}

export interface RideOption {
  id: string;
  tier: Tier;
  price: number;
  etaMin: number;
  durationMin: number;
  vehicle: Vehicle;
  driver: Driver;
  features: RideFeatures;
  /** Only keys active in the rider's preferences are present. */
  meets: Partial<Record<PrefKey, boolean>>;
  matchScore: number;
}

export interface TripDraft {
  pickup: string;
  dropoff: string;
}

export type BookingStatus = "assigned" | "arriving" | "on_trip" | "completed";

export interface Booking {
  id: string;
  userId: string;
  pickup: string;
  dropoff: string;
  option: RideOption;
  preferencesSnapshot: Preferences;
  /** Preference keys that were active (asked for) at booking time. */
  activeKeys: PrefKey[];
  status: BookingStatus;
  createdAt: string;
}

export type PrefAnswer = "yes" | "partly" | "no";

export interface Rating {
  bookingId: string;
  perPreference: Partial<Record<PrefKey, PrefAnswer>>;
  notes: Partial<Record<PrefKey, string>>;
  stars: number;
  createdAt: string;
}
