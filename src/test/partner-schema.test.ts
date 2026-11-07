import { describe, expect, it } from "vitest";
import { profileSchema, stallSchema } from "@/lib/partner-schema";
describe("Marketpartner validation", () => {
  it("supports vendor, organizer, and both profiles", () => { for (const participation of ["vendor", "organizer", "both"]) expect(profileSchema.safeParse({ participation, display_name: "Elle", business_name: "Market Co", city: "Phoenix", phone: "", category: "", description: "" }).success).toBe(true); });
  it("rejects invalid stall dimensions", () => { expect(stallSchema.safeParse({ market_id: "00000000-0000-4000-8000-000000000001", label: "A1", width_ft: 0, depth_ft: 10, daily_price: 45, availability: "available", amenities: [], notes: "" }).success).toBe(false); });
});