import { describe, expect, it } from "vitest";
import { isRatingComplete, summarizeRating } from "./rating";
import { STAGE_MS, stageAt } from "./trip";

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
