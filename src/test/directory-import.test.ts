import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { directoryRecordSchema, type DirectoryRecord } from "@/lib/directory-schema";
import { buildSql, findDuplicate, nameSimilarity, plan, type ExistingMarket } from "@/lib/directory-import";

const base = directoryRecordSchema.parse({
  external_id: "us-oh-cincinnati-findlay-market",
  name: "Findlay Market",
  kind: "public",
  website_url: "https://www.findlaymarket.org/",
  address: "1801 Race Street",
  city: "Cincinnati",
  state: "OH",
  time_zone: "America/New_York",
  schedule_rules: [{ days: ["sat"], opens: "08:00", closes: "18:00" }],
  sources: [{ source_type: "official_website", url: "https://www.findlaymarket.org/", retrieved_on: "2026-11-09" }],
  verification: { status: "verified", confidence: "high" },
});
const rec = (over: Partial<DirectoryRecord>) => ({ ...base, ...over }) as DirectoryRecord;
const existing = (over: Partial<ExistingMarket>): ExistingMarket => ({ external_id: null, slug: "x", name: "X", city: "Cincinnati", state: "OH", latitude: null, longitude: null, website_url: null, claim_status: "unclaimed", ...over });

describe("directory importer", () => {
  it("validates the committed research batch", () => {
    const batch = JSON.parse(readFileSync("data/directory/batch-001.json", "utf8"));
    for (const r of batch.records) expect(directoryRecordSchema.safeParse(r).success, r.external_id).toBe(true);
  });

  it("rejects records without a source or with invented-looking fields", () => {
    expect(directoryRecordSchema.safeParse({ ...base, sources: [] }).success).toBe(false);
    expect(directoryRecordSchema.safeParse({ ...base, state: "Ohio" }).success).toBe(false);
  });

  it("detects the same market listed under a slightly different name", () => {
    expect(findDuplicate(rec({ external_id: "us-oh-cincinnati-findlay-2", name: "The Findlay Market" }), null, [existing({ slug: "findlay-market", name: "Findlay Market" })])?.match.slug).toBe("findlay-market");
  });

  it("does not merge distinct markets run by one organizer on one domain", () => {
    const wed = existing({ slug: "dcfm-wed", name: "Dane County Farmers' Market: Wednesday Market", city: "Madison", state: "WI", website_url: "https://dcfm.org/markets/wednesday-market" });
    const holiday = rec({ external_id: "us-wi-madison-holiday", name: "Dane County Farmers' Market: Holiday Market", city: "Madison", state: "WI", website_url: "https://dcfm.org/markets/holiday-market" });
    expect(findDuplicate(holiday, null, [wed])).toBeNull();
  });

  it("flags nearby markets with similar names", () => {
    const near = existing({ slug: "findlay", name: "Findlay Public Market", latitude: 39.115, longitude: -84.519 });
    expect(findDuplicate(rec({ city: "Cincy" }), { latitude: 39.1151, longitude: -84.5191 }, [near])?.reason).toMatch(/150 m/);
    expect(nameSimilarity("Brooklyn Flea (DUMBO)", "Chelsea Flea")).toBeLessThan(0.5);
  });

  it("never plans changes to organizer-claimed markets", () => {
    const { planned } = plan([base], [existing({ external_id: base.external_id, slug: "findlay-market", name: "Findlay Market", claim_status: "claimed" })], {});
    expect(planned[0]!.action).toBe("skip_claimed");
    expect(buildSql({ planned, flags: [] }, { dataset: "t", sha256: "0", mode: "publish", today: "2026-11-09" })).not.toContain("INSERT INTO public.markets");
  });

  it("keeps unverified schedules out of publishing and escapes SQL", () => {
    const r = rec({ name: "O'Brien's Market", schedule_rules: [], verification: { status: "verified", confidence: "high", notes: [] } });
    const result = plan([r], [], {});
    expect(result.planned[0]!.review_status).toBe("needs_review");
    const sql = buildSql(result, { dataset: "t", sha256: "0", mode: "publish", today: "2026-11-09" });
    expect(sql).toContain("'O''Brien''s Market'");
    expect(sql).toContain("published) VALUES");
    expect(sql).toMatch(/'needs_review', 'high', false\)/);
  });
});
