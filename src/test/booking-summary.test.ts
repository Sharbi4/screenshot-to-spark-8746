import { beforeEach, describe, expect, it, vi } from "vitest";

const generate = vi.hoisted(() => vi.fn());
vi.mock("@lovable.dev/ai-gateway", () => ({
  generateResponse: generate,
  GatewayError: class extends Error {},
}));
import { summarizeBooking, summarizeBookingDetails } from "@/lib/booking-summary.server";

describe("booking summaries", () => {
  beforeEach(() => generate.mockReset());

  it("summarizes the pending request with its actual details", async () => {
    generate.mockResolvedValue({ status: "completed", output: [{ type: "message", content: [{ type: "output_text", text: "Pending Neon Alley request." }] }] });
    expect(await summarizeBooking("neon-alley")).toEqual({ summary: "Pending Neon Alley request.", error: null });
    const call = generate.mock.calls[0];
    if (!call) throw new Error("Expected a summary request");
    const input = JSON.parse(call[0].input);
    expect(input).toMatchObject({ marketId: "neon-alley", status: "Pending", date: "Thu, Nov 5", stall: "C-08", dailyPriceUSD: 60 });
  });

  it("does not generate for a market without a booking", async () => {
    expect((await summarizeBooking("desert-bloom")).summary).toBeNull();
    expect(generate).not.toHaveBeenCalled();
  });

  it("summarizes saved pending requests without changing their date or price", async () => {
    generate.mockResolvedValue({ status: "completed", output: [{ type: "message", content: [{ type: "output_text", text: "Pending request." }] }] });
    await summarizeBookingDetails({ market: "Lantern Row Night Market", city: "Phoenix, AZ", hours: "6 PM – 12 AM", date: "2026-11-13", stall: "Space requested · stall not assigned", status: "Pending", dailyPriceUSD: 85, notes: "Corner preferred" });
    const call = generate.mock.calls[0];
    if (!call) throw new Error("Expected a summary request");
    expect(JSON.parse(call[0].input)).toMatchObject({ date: "2026-11-13", status: "Pending", dailyPriceUSD: 85, notes: "Corner preferred" });
  });

  it("does not display refusals as booking summaries", async () => {
    generate.mockResolvedValue({ status: "completed", output: [{ type: "message", content: [{ type: "refusal", refusal: "No" }] }] });
    expect((await summarizeBooking("neon-alley")).summary).toBeNull();
  });

  it("keeps incomplete output out of the dashboard", async () => {
    generate.mockResolvedValue({ status: "incomplete", output: [{ type: "message", content: [{ type: "output_text", text: "Partial" }] }] });
    expect((await summarizeBooking("neon-alley")).summary).toBeNull();
  });
});