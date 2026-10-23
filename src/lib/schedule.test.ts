import { describe, expect, it } from "vitest";
import {
  buildIcs,
  dayLabel,
  formatSchedule,
  formatTime,
  isValidSchedule,
  scheduleDays,
  slotsFor,
  slotsForDay,
  timeUntil,
} from "./schedule";

// Local-time fixtures so the tests hold in any timezone.
const at = (y: number, m: number, d: number, h = 0, min = 0) => new Date(y, m - 1, d, h, min);
const now = at(2026, 10, 22, 14, 10); // Thu 22 Oct 2026, 2:10 PM

describe("slots", () => {
  it("starts 30 minutes out, rounded up to the next half hour", () => {
    const afternoon = slotsFor(now, "afternoon", now);
    expect(formatTime(afternoon[0])).toBe("3:00 PM");
    expect(formatTime(afternoon.at(-1)!)).toBe("4:30 PM");
    expect(slotsFor(now, "morning", now)).toEqual([]);
  });

  it("offers the whole day from 5 AM to 11:30 PM on future days", () => {
    const tomorrow = slotsForDay(at(2026, 10, 23), now);
    expect(formatTime(tomorrow[0])).toBe("5:00 AM");
    expect(formatTime(tomorrow.at(-1)!)).toBe("11:30 PM");
    expect(tomorrow).toHaveLength(38);
  });

  it("drops today from the day list once no slots remain", () => {
    const late = at(2026, 10, 22, 23, 20);
    const days = scheduleDays(late);
    expect(dayLabel(days[0], late)).toBe("Tomorrow");
    expect(days).toHaveLength(7);
  });
});

describe("isValidSchedule", () => {
  it("requires the lead time and at most a week ahead", () => {
    expect(isValidSchedule(at(2026, 10, 22, 14, 20).toISOString(), now)).toBe(false);
    expect(isValidSchedule(at(2026, 10, 22, 15, 0).toISOString(), now)).toBe(true);
    expect(isValidSchedule(at(2026, 10, 29, 23, 30).toISOString(), now)).toBe(true);
    expect(isValidSchedule(at(2026, 10, 30, 9, 0).toISOString(), now)).toBe(false);
    expect(isValidSchedule("nonsense", now)).toBe(false);
  });
});

describe("formatting", () => {
  it("labels today, tomorrow and later days", () => {
    expect(formatSchedule(at(2026, 10, 22, 17, 30).toISOString(), now)).toBe("Today, 5:30 PM");
    expect(formatSchedule(at(2026, 10, 23, 9, 0).toISOString(), now)).toBe("Tomorrow, 9:00 AM");
    expect(formatSchedule(at(2026, 10, 24, 0, 0).toISOString(), now)).toBe("Sat 24 Oct, 12:00 AM");
  });

  it("describes time until pickup", () => {
    expect(timeUntil(at(2026, 10, 22, 14, 55).toISOString(), now)).toBe("in 45 min");
    expect(timeUntil(at(2026, 10, 22, 17, 30).toISOString(), now)).toBe("in 3 h 20 min");
    expect(timeUntil(at(2026, 10, 24, 14, 10).toISOString(), now)).toBe("in 2 days");
    expect(timeUntil(at(2026, 10, 23, 23, 40).toISOString(), now)).toBe("in 1 day 9 h");
    expect(timeUntil(at(2026, 10, 22, 14, 0).toISOString(), now)).toBe("now");
  });
});

describe("buildIcs", () => {
  it("produces a calendar event with escaped text and a 15-minute alarm", () => {
    const ics = buildIcs({
      id: "abc",
      start: "2026-10-23T09:00:00.000Z",
      durationMin: 25,
      title: "RideChoice: Comfort",
      location: "Union Station, 50 Front St",
      description: "To City Hall; driver Ana B.",
      now: new Date("2026-10-22T12:00:00.000Z"),
    });
    expect(ics).toContain("DTSTART:20261023T090000Z");
    expect(ics).toContain("DTEND:20261023T092500Z");
    expect(ics).toContain("LOCATION:Union Station\\, 50 Front St");
    expect(ics).toContain("DESCRIPTION:To City Hall\\; driver Ana B.");
    expect(ics).toContain("TRIGGER:-PT15M");
    expect(ics.split("\r\n")[0]).toBe("BEGIN:VCALENDAR");
  });
});
