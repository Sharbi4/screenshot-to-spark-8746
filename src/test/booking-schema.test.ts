import { describe, expect, it } from "vitest";
import { bookingRequestSchema } from "@/lib/booking-schema";

const request = { request_key: "d1b5e424-cc88-4f84-a1b5-60f8d4ddaa27", market_id: "lantern-row", booking_date: "2026-11-13", notes: "Corner preferred" };
describe("saved booking requests", () => {
  it("retains the requested date and notes", () => {
    expect(bookingRequestSchema.parse(request)).toMatchObject({ booking_date: "2026-11-13", notes: "Corner preferred" });
  });
  it("never accepts a caller-selected owner, price or approval status", () => {
    const result = bookingRequestSchema.parse({ ...request, owner_id: "someone-else", daily_price: 0, status: "Confirmed" });
    expect(result).not.toHaveProperty("owner_id");
    expect(result).not.toHaveProperty("daily_price");
    expect(result).not.toHaveProperty("status");
  });
  it("requires a real calendar date", () => {
    expect(bookingRequestSchema.safeParse({ ...request, booking_date: "2026-02-30" }).success).toBe(false);
  });
  it("requires exactly one market or stall", () => {
    expect(bookingRequestSchema.safeParse({ ...request, stall_id: request.request_key }).success).toBe(false);
    expect(bookingRequestSchema.safeParse({ ...request, market_id: undefined }).success).toBe(false);
  });
});