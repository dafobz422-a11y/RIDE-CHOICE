import { describe, expect, it } from "vitest";
import { TIERS, generateOptions, hashString, seededRandom } from "./rides";

describe("seededRandom", () => {
  it("is deterministic per seed and in [0, 1)", () => {
    const a = seededRandom(42);
    const b = seededRandom(42);
    const xs = Array.from({ length: 50 }, () => a());
    expect(xs).toEqual(Array.from({ length: 50 }, () => b()));
    expect(xs.every((x) => x >= 0 && x < 1)).toBe(true);
  });

  it("differs across seeds", () => {
    expect(seededRandom(1)()).not.toBe(seededRandom(2)());
  });
});

describe("generateOptions", () => {
  it("returns one option per tier", () => {
    const opts = generateOptions("Union Station", "City Hall");
    expect(opts.map((o) => o.tier)).toEqual(TIERS.map((t) => t.tier));
  });

  it("is deterministic for the same route, ignoring case and spacing", () => {
    expect(generateOptions("Union Station", "City  Hall")).toEqual(
      generateOptions("  union station", "city hall"),
    );
  });

  it("changes with the route and direction", () => {
    const ab = generateOptions("A St", "B St");
    expect(ab).not.toEqual(generateOptions("B St", "A St"));
    expect(hashString("a→b")).not.toBe(hashString("b→a"));
  });

  it("produces sane prices, ETAs and tier traits", () => {
    for (const route of [["a", "b"], ["Airport", "Harbor"], ["x", "y"]]) {
      const opts = generateOptions(route[0], route[1]);
      const byTier = Object.fromEntries(opts.map((o) => [o.tier, o]));
      for (const o of opts) {
        expect(o.price).toBeGreaterThan(5);
        expect(o.etaMin).toBeGreaterThanOrEqual(2);
        expect(o.durationMin).toBeGreaterThanOrEqual(4);
        expect(Number.isInteger(o.etaMin)).toBe(true);
      }
      expect(byTier["Premium"].price).toBeGreaterThan(byTier["Economy"].price);
      expect(byTier["Green EV"].vehicle.powertrain).toBe("ev");
      expect(byTier["Access"].features.wheelchairAccessible).toBe(true);
      expect(byTier["XL"].vehicle.size).toBe("xl");
    }
  });
});
