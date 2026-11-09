// Pure directory-import logic (no I/O): normalisation, duplicate detection, review flags, SQL generation.
import { slugify } from "./marketplace-schema";
import type { DirectoryRecord } from "./directory-schema";

export interface ExistingMarket {
  id?: string;
  external_id: string | null;
  slug: string;
  name: string;
  city: string;
  state: string;
  latitude: number | null;
  longitude: number | null;
  website_url: string | null;
  claim_status: string;
}
export interface Geocode {
  latitude: number;
  longitude: number;
  source: "mapbox_permanent" | "us_census";
  matched: string;
  quality: "exact" | "approximate";
}
export interface Flag {
  external_id: string;
  field: string;
  severity: "info" | "warning" | "blocking";
  message: string;
}
export type Action = "insert" | "update" | "skip_claimed" | "skip_duplicate" | "invalid";
export interface PlannedRecord {
  record: DirectoryRecord;
  slug: string;
  action: Action;
  review_status: "staged" | "needs_review";
  location_status: "verified" | "needs_review" | "pending";
  geocode: Geocode | null;
  duplicateOf?: string | undefined;
}

const STOP = new Set(["the", "market", "markets", "farmers", "farmer's", "farmers'", "of", "at", "and", "a"]);
export const normalizeName = (name: string) =>
  name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9 ]+/g, " ")
    .split(/\s+/)
    .filter((w) => w && !STOP.has(w))
    .join(" ");

/** Token-set Jaccard similarity of normalised names (0..1). */
export function nameSimilarity(a: string, b: string) {
  const A = new Set(normalizeName(a).split(" ").filter(Boolean));
  const B = new Set(normalizeName(b).split(" ").filter(Boolean));
  if (!A.size || !B.size) return 0;
  const inter = [...A].filter((x) => B.has(x)).length;
  return inter / new Set([...A, ...B]).size;
}

export const websiteHost = (url: string | null) => (url ? url.replace(/^https?:\/\/(www\.)?/i, "").split("/")[0]!.toLowerCase() : "");
/** Host + path, lowercased, without scheme/www/trailing slash. Organizers often run several markets on one domain. */
export const websitePage = (url: string | null) => (url ? url.replace(/^https?:\/\/(www\.)?/i, "").replace(/[?#].*$/, "").replace(/\/+$/, "").toLowerCase() : "");

export function distanceMeters(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }) {
  const R = 6371000, toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude), dLng = toRad(b.longitude - a.longitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export const slugFor = (r: Pick<DirectoryRecord, "name" | "city" | "state">) => slugify(`${r.name} ${r.city} ${r.state}`);

/**
 * Find an existing record that is probably the same market. Shared websites (one organizer, many markets)
 * are NOT enough on their own; we require name similarity too.
 */
export function findDuplicate(r: DirectoryRecord, coords: { latitude: number; longitude: number } | null, pool: ExistingMarket[]) {
  for (const e of pool) {
    if (e.external_id && e.external_id === r.external_id) continue; // same record → update path
    const sameCity = e.city.toLowerCase() === r.city.toLowerCase() && e.state === r.state;
    const sim = nameSimilarity(e.name, r.name);
    if (sameCity && (normalizeName(e.name) === normalizeName(r.name) || sim >= 0.75)) return { match: e, reason: `same name in ${r.city}` };
    if (sameCity && sim >= 0.6 && websitePage(e.website_url) && websitePage(e.website_url) === websitePage(r.website_url)) return { match: e, reason: "same web page and similar name" };
    if (coords && e.latitude != null && e.longitude != null && sim >= 0.5 && distanceMeters(coords, { latitude: e.latitude, longitude: e.longitude }) < 150)
      return { match: e, reason: "within 150 m with a similar name" };
  }
  return null;
}

export function reviewFlags(r: DirectoryRecord, geocode: Geocode | null): Flag[] {
  const f: Flag[] = [];
  const add = (field: string, severity: Flag["severity"], message: string) => f.push({ external_id: r.external_id, field, severity, message });
  for (const note of r.verification.notes) add("verification", "info", note);
  if (r.verification.status === "needs_review") add("verification", "blocking", "Record marked needs_review by researcher.");
  if (!r.schedule_rules.length) add("schedule", "blocking", "No verified operating schedule.");
  if (r.schedule_rules.some((s) => !s.opens || !s.closes)) add("schedule", "warning", "Opening hours not published; page shows 'check website for hours'.");
  // A directory page can be useful without coordinates; it just stays off the map until the pin is resolved.
  if (r.latitude == null && !geocode) add("location", "warning", r.address ? "Address could not be geocoded; hidden from the map until a pin is confirmed." : "No street address published; hidden from the map until a pin is placed manually.");
  if (geocode?.quality === "approximate") add("location", "warning", `Approximate geocode (${geocode.matched}).`);
  if (r.photo.status === "none") add("photo", "info", "No licensed photo; styled placeholder will be used.");
  if (r.booth_price_note) add("booth_price_note", "info", "Booth price note must be verbatim from the organizer.");
  return f;
}

export function plan(records: DirectoryRecord[], existing: ExistingMarket[], geocodes: Record<string, Geocode | null>) {
  const planned: PlannedRecord[] = [];
  const flags: Flag[] = [];
  const pool = [...existing];
  const usedSlugs = new Set(existing.map((e) => e.slug));
  for (const r of records) {
    const geocode = r.latitude != null && r.longitude != null ? null : (geocodes[r.external_id] ?? null);
    const coords = r.latitude != null && r.longitude != null ? { latitude: r.latitude, longitude: r.longitude } : geocode;
    const current = existing.find((e) => e.external_id === r.external_id);
    const recFlags = reviewFlags(r, geocode);
    let slug = current?.slug ?? slugFor(r);
    let action: Action = current ? "update" : "insert";
    let duplicateOf: string | undefined;
    if (current && current.claim_status === "claimed") {
      action = "skip_claimed";
      recFlags.push({ external_id: r.external_id, field: "record", severity: "info", message: "Market is organizer-controlled; research data not applied." });
    } else if (!current) {
      const dup = findDuplicate(r, coords, pool);
      if (dup) {
        action = "skip_duplicate";
        duplicateOf = dup.match.slug;
        recFlags.push({ external_id: r.external_id, field: "record", severity: "blocking", message: `Possible duplicate of /m/${dup.match.slug} (${dup.reason}).` });
      } else {
        for (let i = 2; usedSlugs.has(slug); i++) slug = `${slugFor(r)}-${i}`;
      }
    }
    usedSlugs.add(slug);
    const blocking = recFlags.some((x) => x.severity === "blocking");
    const location_status = coords ? (geocode?.quality === "approximate" ? "needs_review" : "verified") : "pending";
    planned.push({ record: r, slug, action, geocode, duplicateOf, location_status, review_status: blocking ? "needs_review" : "staged" });
    if (action === "insert" || action === "update") pool.push({ external_id: r.external_id, slug, name: r.name, city: r.city, state: r.state, latitude: coords?.latitude ?? null, longitude: coords?.longitude ?? null, website_url: r.website_url, claim_status: "unclaimed" });
    flags.push(...recFlags);
  }
  return { planned, flags };
}

// ---------- SQL generation (applied through Lovable's SQL runner) ----------
const q = (v: string | null | undefined) => (v == null ? "NULL" : `'${String(v).replace(/'/g, "''")}'`);
const qArr = (a: string[]) => `ARRAY[${a.map(q).join(",")}]::text[]`;
const qDateArr = (a: string[]) => (a.length ? `ARRAY[${a.map(q).join(",")}]::date[]` : "'{}'::date[]");
const qJson = (v: unknown) => `${q(JSON.stringify(v))}::jsonb`;
const qNum = (n: number | null | undefined) => (n == null ? "NULL" : String(Number(n)));

export function buildSql(p: { planned: PlannedRecord[]; flags: Flag[] }, opts: { dataset: string; sha256: string; mode: "stage" | "publish"; today: string }) {
  const lines = [`-- Generated by scripts/directory/import.ts · dataset ${opts.dataset} · sha256 ${opts.sha256} · mode ${opts.mode}`, `-- Safe to re-run: upserts by external_id and never touches organizer-claimed markets.`, "BEGIN;"];
  const applied = p.planned.filter((x) => x.action === "insert" || x.action === "update");
  for (const x of applied) {
    const r = x.record;
    const lat = r.latitude ?? x.geocode?.latitude ?? null;
    const lng = r.longitude ?? x.geocode?.longitude ?? null;
    const geoSource = r.latitude != null ? "official_source" : (x.geocode?.source ?? "");
    const publish = opts.mode === "publish" && x.review_status === "staged";
    const status = publish ? "published" : x.review_status;
    const verifiedOn = r.sources.map((s) => s.retrieved_on).sort().at(-1) ?? opts.today;
    const cols: [string, string][] = [
      ["external_id", q(r.external_id)], ["slug", q(x.slug)], ["name", q(r.name)], ["kind", q(r.kind)], ["description", q(r.description)],
      ["organizer_name", q(r.organizer_name)], ["website_url", q(r.website_url)], ["contact_email", q(r.contact_email)], ["contact_phone", q(r.contact_phone)],
      ["social_links", qJson(r.social_links)], ["venue_name", q(r.venue_name)], ["address", q(r.address)], ["city", q(r.city)], ["region", q(r.state)],
      ["state", q(r.state)], ["postal_code", q(r.postal_code)], ["time_zone", q(r.time_zone)], ["latitude", qNum(lat)], ["longitude", qNum(lng)],
      ["geocode_source", q(geoSource)], ["location_status", q(x.location_status)], ["schedule_rules", qJson(r.schedule_rules)], ["season_note", q(r.season_note)],
      ["upcoming_dates", qDateArr(r.upcoming_dates)], ["vendor_applications", q(r.vendor_applications)], ["vendor_application_url", q(r.vendor_application_url)],
      ["vendor_types", qArr(r.vendor_types)], ["vendor_requirements", q(r.vendor_requirements)], ["booth_price_note", q(r.booth_price_note)], ["amenities", qArr(r.amenities)],
      ["source_name", q("Official website")], ["source_url", q(r.sources[0]!.url)], ["verified_at", q(verifiedOn)], ["last_verified_at", q(verifiedOn)],
      ["review_status", q(status)], ["confidence", q(r.verification.confidence)], ["published", publish ? "true" : "false"],
    ];
    const names = cols.map((c) => c[0]);
    lines.push(
      `INSERT INTO public.markets (${names.join(", ")}) VALUES (${cols.map((c) => c[1]).join(", ")})`,
      `ON CONFLICT (external_id) DO UPDATE SET ${names.filter((n) => n !== "external_id" && n !== "slug").map((n) => `${n} = EXCLUDED.${n}`).join(", ")}, updated_at = now()`,
      `WHERE public.markets.claim_status = 'unclaimed';`,
    );
    for (const s of r.sources)
      lines.push(
        `INSERT INTO public.market_sources (market_id, source_type, url, fields, retrieved_on, notes) SELECT id, ${q(s.source_type)}, ${q(s.url)}, ${qArr(s.fields)}, ${q(s.retrieved_on)}, ${q(s.notes)} FROM public.markets WHERE external_id = ${q(r.external_id)} AND claim_status = 'unclaimed'`,
        `ON CONFLICT (market_id, url) DO UPDATE SET fields = EXCLUDED.fields, retrieved_on = EXCLUDED.retrieved_on, notes = EXCLUDED.notes;`,
      );
  }
  for (const f of p.flags)
    lines.push(
      `INSERT INTO public.market_review_flags (market_id, external_id, field, severity, message) SELECT (SELECT id FROM public.markets WHERE external_id = ${q(f.external_id)}), ${q(f.external_id)}, ${q(f.field)}, ${q(f.severity)}, ${q(f.message)} ON CONFLICT (external_id, field, message) DO NOTHING;`,
    );
  const summary = summarize(p, opts.mode);
  lines.push(`INSERT INTO public.directory_import_runs (dataset, dataset_sha256, mode, summary) VALUES (${q(opts.dataset)}, ${q(opts.sha256)}, ${q(opts.mode)}, ${qJson(summary)});`, "COMMIT;", "");
  return lines.join("\n");
}

export function summarize(p: { planned: PlannedRecord[]; flags: Flag[] }, mode: "stage" | "publish") {
  const count = (fn: (x: PlannedRecord) => boolean) => p.planned.filter(fn).length;
  const applied = (x: PlannedRecord) => x.action === "insert" || x.action === "update";
  return {
    researched: p.planned.length,
    verified: count((x) => x.record.verification.status === "verified"),
    needs_review: count((x) => x.review_status === "needs_review"),
    ready_to_stage: count((x) => applied(x) && x.review_status === "staged"),
    would_publish: mode === "publish" ? count((x) => applied(x) && x.review_status === "staged") : 0,
    on_map: count((x) => applied(x) && x.location_status === "verified" && x.review_status === "staged"),
    inserts: count((x) => x.action === "insert"),
    updates: count((x) => x.action === "update"),
    skipped_claimed: count((x) => x.action === "skip_claimed"),
    skipped_duplicates: count((x) => x.action === "skip_duplicate"),
    blocking_flags: p.flags.filter((f) => f.severity === "blocking").length,
    warnings: p.flags.filter((f) => f.severity === "warning").length,
  };
}
