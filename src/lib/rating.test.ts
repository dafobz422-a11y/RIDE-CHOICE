import { describe, expect, it } from "vitest";
import { historyStats, isRatingComplete, summarizeRating } from "./rating";
import type { Rating } from "./types";
import { STAGE_MS, stageAt, tripProgress } from "./trip";

describe("summarizeRating", () => {
  it("counts yes as met and reports partly and missed separately", () => {
    const s = summarizeRating(
      { price: "yes", wait: "yes", quiet: "partly", eco: "no", temperature: "yes", size: "yes" },
      ["price", "wait", "size", "quiet", "temperature", "eco"],
    );
    expect(s).toMatchObject({ met: 4, partly: 1, missed: 1, total: 6 });
    expect(s.label).toBe("Met 4 of 6 preferences");
  });

  it("ignores answers for keys that were not snapshotted", () => {
    const s = summarizeRating({ price: "yes", eco: "yes" }, ["price", "wait"]);
    expect(s.label).toBe("Met 1 of 2 preferences");
  });

  it("uses singular wording for one preference", () => {
    expect(summarizeRating({ price: "yes" }, ["price"]).label).toBe("Met 1 of 1 preference");
  });
});

describe("isRatingComplete", () => {
  it("requires every key answered and 1–5 stars", () => {
    expect(isRatingComplete({ price: "yes" }, ["price", "wait"], 4)).toBe(false);
    expect(isRatingComplete({ price: "yes", wait: "no" }, ["price", "wait"], 0)).toBe(false);
    expect(isRatingComplete({ price: "yes", wait: "no" }, ["price", "wait"], 5)).toBe(true);
  });
});

describe("stageAt", () => {
  const start = "2026-01-01T00:00:00.000Z";
  const t0 = Date.parse(start);

  it("advances one stage every 3 seconds and stops at completed", () => {
    expect(stageAt(start, t0, "assigned")).toBe("assigned");
    expect(stageAt(start, t0 + STAGE_MS, "assigned")).toBe("arriving");
    expect(stageAt(start, t0 + STAGE_MS * 2 + 10, "assigned")).toBe("on_trip");
    expect(stageAt(start, t0 + STAGE_MS * 9, "assigned")).toBe("completed");
  });

  it("never goes backwards from a stored status", () => {
    expect(stageAt(start, t0, "completed")).toBe("completed");
    expect(stageAt(start, t0, "on_trip")).toBe("on_trip");
  });
});

describe("tripProgress", () => {
  const start = "2026-01-01T00:00:00.000Z";
  const t0 = Date.parse(start);

  it("reports the fraction and seconds left within a stage", () => {
    expect(tripProgress(start, t0, "assigned")).toEqual({ stage: "assigned", fraction: 0, secondsLeft: 3 });
    expect(tripProgress(start, t0 + STAGE_MS * 1.5, "assigned")).toEqual({ stage: "arriving", fraction: 0.5, secondsLeft: 2 });
  });

  it("is complete once completed, by time or by skipping", () => {
    expect(tripProgress(start, t0 + STAGE_MS * 3, "assigned")).toEqual({ stage: "completed", fraction: 1, secondsLeft: 0 });
    expect(tripProgress(start, t0, "completed").stage).toBe("completed");
  });

  it("holds a stored stage that is ahead of the clock", () => {
    expect(tripProgress(start, t0 + 500, "on_trip")).toMatchObject({ stage: "on_trip", fraction: 0 });
  });
});

describe("historyStats", () => {
  const rating = (stars: number, perPreference: Rating["perPreference"]): Rating => ({
    bookingId: "b",
    perPreference,
    notes: {},
    stars,
    createdAt: "",
  });

  it("averages stars and preference hit rate over rated rides only", () => {
    const s = historyStats([
      { activeKeys: ["price", "wait"], rating: rating(5, { price: "yes", wait: "yes" }) },
      { activeKeys: ["price", "wait"], rating: rating(2, { price: "no", wait: "partly" }) },
      { activeKeys: ["price"], rating: null },
    ]);
    expect(s).toEqual({ rides: 3, rated: 2, avgStars: 3.5, metPct: 50 });
  });

  it("returns nulls with nothing rated", () => {
    expect(historyStats([])).toEqual({ rides: 0, rated: 0, avgStars: null, metPct: null });
  });
});
