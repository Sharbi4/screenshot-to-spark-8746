import { describe, expect, it } from "vitest";
import { appearanceSchema, marketClaimSchema, slugify, slugSchema, vendorProfileSchema } from "@/lib/marketplace-schema";

const base = { slug: "maple-bakery", business_name: "Maple Bakery", logo_url: "", cover_image_url: "", website_url: "", instagram_handle: "", contact_email: "" };

describe("marketplace validation", () => {
  it("creates URL-safe slugs", () => {
    expect(slugify("Café & Crêpes — Phoenix!")).toBe("cafe-and-crepes-phoenix");
    expect(slugSchema.safeParse("Bad Slug").success).toBe(false);
    expect(slugSchema.safeParse("a--b").success).toBe(false);
    expect(slugSchema.parse("good-slug-1")).toBe("good-slug-1");
  });

  it("normalises vendor profile links and handles", () => {
    const parsed = vendorProfileSchema.parse({ ...base, instagram_handle: "@maple.bakes", website_url: "https://maple.example" });
    expect(parsed.instagram_handle).toBe("maple.bakes");
    expect(parsed.logo_url).toBeNull();
    expect(parsed.published).toBe(false);
  });

  it("rejects insecure image links and scripts", () => {
    expect(vendorProfileSchema.safeParse({ ...base, logo_url: "http://x.example/logo.png" }).success).toBe(false);
    expect(vendorProfileSchema.safeParse({ ...base, website_url: "javascript:alert(1)" }).success).toBe(false);
  });

  it("requires an authority attestation for claims", () => {
    const claim = { market_id: "00000000-0000-4000-8000-000000000001", full_name: "Ana", role_title: "Manager", work_email: "ana@market.example" };
    expect(marketClaimSchema.safeParse(claim).success).toBe(false);
    expect(marketClaimSchema.safeParse({ ...claim, attest: true }).success).toBe(true);
  });

  it("validates appearance dates", () => {
    const value = { market_id: "00000000-0000-4000-8000-000000000001", vendor_slug: "maple-bakery" };
    expect(appearanceSchema.safeParse({ ...value, appearance_date: "2026-02-30" }).success).toBe(false);
    expect(appearanceSchema.safeParse({ ...value, appearance_date: "2026-12-05" }).success).toBe(true);
  });
});
