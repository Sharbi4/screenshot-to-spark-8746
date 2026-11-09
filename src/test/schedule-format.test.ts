import { describe, expect, it } from "vitest";
import { formatDays, formatRule, formatTime, openingHoursSpec } from "@/lib/schedule-format";

describe("schedule formatting", () => {
  it("formats times", () => {
    expect(formatTime("06:15")).toBe("6:15 AM");
    expect(formatTime("13:00")).toBe("1 PM");
    expect(formatTime("12:00")).toBe("Noon");
    expect(formatTime("24:00")).toBe("Midnight");
    expect(formatTime(null)).toBeNull();
  });
  it("formats day sets", () => {
    expect(formatDays(["sat"])).toBe("Saturdays");
    expect(formatDays(["tue", "wed", "thu", "fri"])).toBe("Tue–Fri");
    expect(formatDays(["sat", "sun"])).toBe("Sat & Sun");
    expect(formatDays(["mon", "wed", "fri"])).toBe("Mon, Wed, Fri");
    expect(formatDays(["sun", "mon", "tue"])).toBe("Sun–Tue");
    expect(formatDays(["fri", "sat", "sun", "mon"])).toBe("Fri–Mon");
    expect(formatDays(["mon", "tue", "wed", "thu", "fri", "sat", "sun"])).toBe("Daily");
  });
  it("never invents hours that were not published", () => {
    expect(formatRule({ label: "Market", days: ["sun"], opens: null, closes: null }).hours).toBe("Check the official website for hours");
    expect(openingHoursSpec([{ label: "Market", days: ["sun"], opens: null, closes: null }])).toEqual([]);
  });
  it("includes seasonal ranges", () => {
    expect(formatRule({ label: "Market", days: ["sat"], opens: "06:15", closes: "13:45", starts_on: "2026-04-11", ends_on: "2026-11-14" }).range).toBe("Apr 11 – Nov 14, 2026");
  });
});
