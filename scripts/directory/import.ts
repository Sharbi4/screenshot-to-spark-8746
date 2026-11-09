#!/usr/bin/env bun
/**
 * MarketBloom directory importer. Never writes to a database directly: it produces a
 * reviewable report + CSV and an idempotent SQL file that is applied through Lovable.
 *
 *   bun scripts/directory/import.ts --dataset data/directory/batch-001.json [--mode stage|publish]
 *        [--existing existing-markets.json] [--geocoder auto|mapbox|census|none] [--out data/directory/out]
 *
 * Geocoding: Mapbox Geocoding v6 with permanent=true when MAPBOX_SECRET_TOKEN is set (results may be
 * stored under Mapbox's permanent-geocoding terms); the US Census Bureau geocoder (public domain) is used
 * as a cross-check, or on its own when no Mapbox token is configured. Results are cached.
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { directoryRecordSchema, type DirectoryRecord } from "../../src/lib/directory-schema";
import { buildSql, distanceMeters, plan, summarize, type ExistingMarket, type Geocode } from "../../src/lib/directory-import";

const args = Object.fromEntries(process.argv.slice(2).join(" ").split(/\s*--/).filter(Boolean).map((a) => { const [k, ...v] = a.split(/\s+/); return [k!, v.join(" ") || "true"]; }));
const datasetPath = args.dataset ?? "data/directory/batch-001.json";
const mode = (args.mode ?? "stage") as "stage" | "publish";
const outDir = args.out ?? "data/directory/out";
const cachePath = "data/directory/geocode-cache.json";
const mapboxToken = process.env.MAPBOX_SECRET_TOKEN ?? "";
const geocoder = args.geocoder ?? "auto";
const today = new Date().toISOString().slice(0, 10);

const raw = readFileSync(datasetPath, "utf8");
const sha256 = createHash("sha256").update(raw).digest("hex");
const dataset = JSON.parse(raw) as { batch: string; records: unknown[] };
const errors: { index: number; external_id?: string; issues: string[] }[] = [];
const records: DirectoryRecord[] = [];
dataset.records.forEach((r, index) => {
  const parsed = directoryRecordSchema.safeParse(r);
  if (parsed.success) records.push(parsed.data);
  else errors.push({ index, external_id: (r as { external_id?: string }).external_id, issues: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`) });
});
const ids = new Set<string>();
for (const r of records) { if (ids.has(r.external_id)) errors.push({ index: -1, external_id: r.external_id, issues: ["duplicate external_id in dataset"] }); ids.add(r.external_id); }

const existing: ExistingMarket[] = args.existing ? JSON.parse(readFileSync(args.existing, "utf8")) : [];
type CacheEntry = { mapbox?: Geocode | null; census?: Geocode | null };
const cache: Record<string, CacheEntry> = existsSync(cachePath) ? JSON.parse(readFileSync(cachePath, "utf8")) : {};
const addressOf = (r: DirectoryRecord) => [r.address, r.city, `${r.state} ${r.postal_code}`.trim()].filter(Boolean).join(", ");

async function census(address: string): Promise<Geocode | null> {
  const u = new URL("https://geocoding.geo.census.gov/geocoder/locations/onelineaddress");
  u.search = new URLSearchParams({ address, benchmark: "4", format: "json" }).toString();
  const res = await fetch(u, { headers: { "User-Agent": "MarketBloomDirectory/0.1" } });
  if (!res.ok) throw new Error(`Census geocoder HTTP ${res.status}`);
  const m = (await res.json()).result?.addressMatches?.[0];
  if (!m) return null;
  const house = address.match(/^\d+/)?.[0];
  return { latitude: m.coordinates.y, longitude: m.coordinates.x, source: "us_census", matched: m.matchedAddress, quality: house && String(m.matchedAddress).startsWith(house) ? "exact" : "approximate" };
}
async function mapbox(address: string): Promise<Geocode | null> {
  const u = new URL("https://api.mapbox.com/search/geocode/v6/forward");
  u.search = new URLSearchParams({ q: address, country: "us", limit: "1", types: "address,street", permanent: "true", access_token: mapboxToken }).toString();
  const res = await fetch(u);
  if (!res.ok) throw new Error(`Mapbox geocoder HTTP ${res.status}`);
  const f = (await res.json()).features?.[0];
  if (!f) return null;
  const confidence = f.properties?.match_code?.confidence as string | undefined;
  return { latitude: f.geometry.coordinates[1], longitude: f.geometry.coordinates[0], source: "mapbox_permanent", matched: f.properties?.full_address ?? "", quality: confidence === "exact" || confidence === "high" ? "exact" : "approximate" };
}

const geocodes: Record<string, Geocode | null> = {};
const geoNotes: { external_id: string; message: string }[] = [];
for (const r of records) {
  if (r.latitude != null || !r.address || geocoder === "none") continue;
  const key = addressOf(r);
  const entry = (cache[key] ??= {});
  try {
    if ((geocoder === "auto" || geocoder === "mapbox") && mapboxToken && entry.mapbox === undefined) entry.mapbox = await mapbox(key);
    if ((geocoder === "auto" || geocoder === "census") && entry.census === undefined) entry.census = await census(key);
  } catch (e) {
    geoNotes.push({ external_id: r.external_id, message: `Geocoding error: ${(e as Error).message}` });
  }
  const primary = entry.mapbox ?? entry.census ?? null;
  if (entry.mapbox && entry.census) {
    const d = distanceMeters(entry.mapbox, entry.census);
    if (d > 300) { geoNotes.push({ external_id: r.external_id, message: `Mapbox and Census disagree by ${Math.round(d)} m.` }); if (primary) primary.quality = "approximate"; }
  }
  geocodes[r.external_id] = primary;
}
writeFileSync(cachePath, JSON.stringify(cache, null, 2) + "\n");

const result = plan(records, existing, geocodes);
for (const n of geoNotes) result.flags.push({ external_id: n.external_id, field: "location", severity: "warning", message: n.message });
const summary = { ...summarize(result, mode), invalid: errors.length };
mkdirSync(outDir, { recursive: true });
const stem = join(outDir, `${basename(datasetPath, ".json")}.${mode}`);
writeFileSync(`${stem}.sql`, buildSql(result, { dataset: dataset.batch, sha256, mode, today }));
writeFileSync(`${stem}.report.json`, JSON.stringify({ dataset: dataset.batch, sha256, mode, generated_on: today, geocoder: mapboxToken ? "mapbox+census" : "census", summary, errors, flags: result.flags }, null, 2) + "\n");

const csvCell = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
const header = ["external_id", "slug", "name", "category", "address", "city", "state", "postal_code", "latitude", "longitude", "geocode_source", "schedule", "website", "source_urls", "verification", "confidence", "location_status", "review_status", "photo_status", "booking_status", "action", "last_verified"];
const rows = result.planned.map((x) => {
  const r = x.record;
  const sched = r.schedule_rules.map((s) => `${s.label}: ${s.days.join("/")} ${s.opens ?? "?"}-${s.closes ?? "?"}${s.starts_on ? ` from ${s.starts_on}` : ""}${s.ends_on ? ` to ${s.ends_on}` : ""}`).join("; ");
  return [r.external_id, x.slug, r.name, r.kind, r.address, r.city, r.state, r.postal_code, r.latitude ?? x.geocode?.latitude ?? "", r.longitude ?? x.geocode?.longitude ?? "", x.geocode?.source ?? "", sched, r.website_url, r.sources.map((s) => s.url).join(" "), r.verification.status, r.verification.confidence, x.location_status, x.review_status, r.photo.status === "none" ? "none (placeholder)" : "licensed", "directory only (not bookable)", x.action, r.sources.map((s) => s.retrieved_on).sort().at(-1)];
});
writeFileSync(`${stem}.review.csv`, [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\n") + "\n");

const md = [
  `# Import report — ${dataset.batch} (${mode})`, "", `Generated ${today} · dataset sha256 \`${sha256.slice(0, 12)}\` · geocoder: ${mapboxToken ? "Mapbox (permanent) + Census cross-check" : "US Census only (Mapbox token not configured)"}`, "",
  "> Nothing has been written to the database. Apply the SQL through Lovable after review.", "",
  "| Metric | Count |", "| --- | --- |", ...Object.entries(summary).map(([k, v]) => `| ${k.replace(/_/g, " ")} | ${v} |`), "",
  "## Records", "", "| Market | City | Category | Location | Review | Action |", "| --- | --- | --- | --- | --- | --- |",
  ...result.planned.map((x) => `| ${x.record.name} | ${x.record.city}, ${x.record.state} | ${x.record.kind} | ${x.location_status}${x.geocode ? ` (${x.geocode.source})` : ""} | ${x.review_status} | ${x.action}${x.duplicateOf ? ` → /m/${x.duplicateOf}` : ""} |`), "",
  "## Flags", "", ...result.flags.filter((f) => f.severity !== "info").map((f) => `- **${f.severity}** · \`${f.external_id}\` · ${f.field}: ${f.message}`), "",
  ...(errors.length ? ["## Validation errors", "", ...errors.map((e) => `- ${e.external_id ?? `#${e.index}`}: ${e.issues.join("; ")}`), ""] : []),
].join("\n");
writeFileSync(`${stem}.report.md`, md);
console.log(md.split("## Records")[0]);
console.log(`Wrote ${stem}.{sql,report.md,report.json,review.csv}`);
if (errors.length) process.exitCode = 1;
