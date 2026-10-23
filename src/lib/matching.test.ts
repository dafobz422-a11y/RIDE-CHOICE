import { describe, expect, it } from "vitest";
import {
  compareByPriority,
  evaluate,
  failedHardKeys,
  isEligible,
  meetsPreference,
  selectOptions,
  totalTime,
} from "./matching";
import { DEFAULT_PREFERENCES, activeKeys } from "./prefs";
import { generateOptions } from "./rides";
import type { Preferences, RideOption } from "./types";

function option(overrides: Partial<RideOption> & { id: string }): RideOption {
  return {
    tier: "Economy",
    price: 20,
    etaMin: 5,
    durationMin: 15,
    vehicle: {
      make: "Toyota",
      model: "Corolla",
      color: "Blue",
      plate: "ABC-123",
      size: "standard",
      seats: 4,
      powertrain: "gas",
    },
    driver: { name: "Ana B.", rating: 4.8, trips: 100 },
    features: { quietMode: false, climateControl: false, wheelchairAccessible: false },
    meets: {},
    matchScore: 0,
    ...overrides,
  };
}

const prefs = (p: Partial<Preferences> = {}): Preferences => ({ ...DEFAULT_PREFERENCES, ...p });

describe("activeKeys", () => {
  it("always includes price and wait", () => {
    expect(activeKeys(DEFAULT_PREFERENCES)).toEqual(["price", "wait"]);
  });

  it("includes opted-in preferences in display order", () => {
    const keys = activeKeys(
      prefs({ vehicleSize: "xl", wheelchair: true, quiet: true, temperature: "cool", eco: true }),
    );
    expect(keys).toEqual(["price", "wait", "size", "accessible", "quiet", "temperature", "eco"]);
  });
});

describe("meetsPreference", () => {
  const o = option({ id: "a", price: 30, etaMin: 8 });

  it("checks price and wait limits inclusively", () => {
    expect(meetsPreference(o, "price", prefs({ maxPrice: 30 }))).toBe(true);
    expect(meetsPreference(o, "price", prefs({ maxPrice: 29 }))).toBe(false);
    expect(meetsPreference(o, "wait", prefs({ maxWaitMin: 8 }))).toBe(true);
    expect(meetsPreference(o, "wait", prefs({ maxWaitMin: 7 }))).toBe(false);
  });

  it("treats hybrid and EV as eco, gas as not", () => {
    const p = prefs({ eco: true });
    expect(meetsPreference(o, "eco", p)).toBe(false);
    expect(meetsPreference({ ...o, vehicle: { ...o.vehicle, powertrain: "hybrid" } }, "eco", p)).toBe(true);
    expect(meetsPreference({ ...o, vehicle: { ...o.vehicle, powertrain: "ev" } }, "eco", p)).toBe(true);
  });

  it("matches vehicle size exactly unless any", () => {
    expect(meetsPreference(o, "size", prefs({ vehicleSize: "xl" }))).toBe(false);
    expect(meetsPreference(o, "size", prefs({ vehicleSize: "standard" }))).toBe(true);
    expect(meetsPreference(o, "size", prefs({ vehicleSize: "any" }))).toBe(true);
  });
});

describe("evaluate", () => {
  it("scores only active preferences", () => {
    const p = prefs({ quiet: true, eco: true, maxPrice: 25 });
    const scored = evaluate(option({ id: "a", price: 20, features: { quietMode: true, climateControl: false, wheelchairAccessible: false } }), p);
    expect(scored.meets).toEqual({ price: true, wait: true, quiet: true, eco: false });
    expect(scored.matchScore).toBe(3);
  });

  it("only hard preferences decide eligibility", () => {
    const p = prefs({ eco: true, maxPrice: 10 });
    const scored = evaluate(option({ id: "a", price: 20 }), p);
    expect(failedHardKeys(scored)).toEqual(["price"]);
    expect(isEligible(scored)).toBe(false);
    const cheap = evaluate(option({ id: "b", price: 9 }), p);
    expect(cheap.meets.eco).toBe(false);
    expect(isEligible(cheap)).toBe(true);
  });
});

describe("compareByPriority", () => {
  const a = evaluate(option({ id: "a", price: 15, etaMin: 9, durationMin: 20, tier: "Economy" }), DEFAULT_PREFERENCES);
  const b = evaluate(option({ id: "b", price: 25, etaMin: 3, durationMin: 18, tier: "Premium" }), DEFAULT_PREFERENCES);

  it("sorts cheapest first", () => {
    expect([b, a].sort(compareByPriority("cheapest")).map((o) => o.id)).toEqual(["a", "b"]);
  });
  it("sorts fastest by pickup + trip time", () => {
    expect([a, b].sort(compareByPriority("fastest")).map((o) => o.id)).toEqual(["b", "a"]);
  });
  it("sorts comfort by tier", () => {
    expect([a, b].sort(compareByPriority("comfort")).map((o) => o.id)).toEqual(["b", "a"]);
  });
});

describe("selectOptions", () => {
  it("shows at most 4 eligible options, all eligible, sorted by priority", () => {
    const raw = [10, 12, 14, 16, 18, 20].map((price, i) => option({ id: `o${i}`, price }));
    const { shown, eligibleCount } = selectOptions(raw, prefs({ maxPrice: 100 }));
    expect(eligibleCount).toBe(6);
    expect(shown).toHaveLength(4);
    expect(shown.every((s) => s.eligible)).toBe(true);
    expect(shown.map((s) => s.option.price)).toEqual([10, 12, 14, 16]);
  });

  it("pads with nearest misses labeled by failed preference when fewer than 3 qualify", () => {
    const raw = [
      option({ id: "ok", price: 18 }),
      option({ id: "near", price: 22 }),
      option({ id: "far", price: 60 }),
      option({ id: "slow", price: 19, etaMin: 30 }),
    ];
    const { shown, eligibleCount } = selectOptions(raw, prefs({ maxPrice: 20, maxWaitMin: 10 }));
    expect(eligibleCount).toBe(1);
    expect(shown.map((s) => s.option.id)).toEqual(["ok", "near", "slow"]);
    expect(shown[1]).toMatchObject({ eligible: false, failed: ["price"] });
    expect(shown[2]).toMatchObject({ eligible: false, failed: ["wait"] });
  });

  it("assigns each badge once, only to eligible options", () => {
    const raw = [
      option({ id: "cheap", price: 10, etaMin: 9 }),
      option({ id: "fast", price: 30, etaMin: 2, durationMin: 10 }),
      option({ id: "miss", price: 5, etaMin: 40 }),
    ];
    const { shown } = selectOptions(raw, prefs({ maxPrice: 50 }));
    const byId = Object.fromEntries(shown.map((s) => [s.option.id, s.badges]));
    expect(byId.cheap).toContain("Cheapest");
    expect(byId.fast).toContain("Fastest");
    expect(byId.miss).toEqual([]);
    const all = shown.flatMap((s) => s.badges);
    expect(all.filter((b) => b === "Best match")).toHaveLength(1);
  });

  it("returns 3–4 options for real generated rides under default preferences", () => {
    const { shown } = selectOptions(generateOptions("Union Station", "City Hall"), DEFAULT_PREFERENCES);
    expect(shown.length).toBeGreaterThanOrEqual(3);
    expect(shown.length).toBeLessThanOrEqual(4);
  });

  it("still returns 3 options when nothing qualifies", () => {
    const { shown, eligibleCount } = selectOptions(
      generateOptions("A", "B"),
      prefs({ maxPrice: 1, maxWaitMin: 1 }),
    );
    expect(eligibleCount).toBe(0);
    expect(shown).toHaveLength(3);
    expect(shown.every((s) => !s.eligible && s.failed.length > 0)).toBe(true);
  });

  it("puts the accessible tier first when wheelchair access is required", () => {
    const { shown } = selectOptions(generateOptions("A", "B"), prefs({ wheelchair: true, maxPrice: 200, maxWaitMin: 20 }));
    expect(shown[0].option.tier).toBe("Access");
    expect(shown[0].eligible).toBe(true);
    expect(shown.slice(1).every((s) => s.failed.includes("accessible"))).toBe(true);
  });
});

describe("totalTime", () => {
  it("adds pickup wait and trip duration", () => {
    expect(totalTime(option({ id: "a", etaMin: 4, durationMin: 11 }))).toBe(15);
  });
});
