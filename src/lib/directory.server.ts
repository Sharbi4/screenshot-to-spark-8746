import { markets as demoMarkets, type Amenity } from "./markets";
import { marketKindLabel, type MarketKind } from "./marketplace-schema";
import type { ScheduleRule } from "./directory-schema";
import { createPublicClient } from "./supabase-public.server";

const amenityNames: Amenity[] = ["power", "water", "corner", "shade", "wifi", "parking"];
const todayIso = () => new Date().toISOString().slice(0, 10);

export interface VendorAppearance {
  date: string;
  booth: string;
  featured: boolean;
  vendor: { slug: string; name: string; logo: string | null; category: string; products: string[] };
}
export interface BoothType {
  id: string;
  label: string;
  size: string;
  price: number;
  available: boolean;
  amenities: Amenity[];
}
export interface MarketSummary {
  slug: string;
  name: string;
  city: string;
  schedule: string;
  image: string | null;
  example: boolean;
}
export interface MarketProfile {
  source: "directory" | "example";
  id: string | null;
  slug: string;
  name: string;
  kindLabel: string;
  city: string;
  address: string;
  description: string;
  schedule: string;
  hours: string;
  images: string[];
  websiteUrl: string | null;
  categories: string[];
  amenities: Amenity[];
  claimed: boolean;
  provenance: { name: string; url: string | null; verifiedAt: string | null } | null;
  pin: { x: number; y: number } | null;
  /** Present only for example listings: links to the existing demo listing + booking flow. */
  exampleListing: { id: string; price: number } | null;
  vendors: VendorAppearance[];
  boothTypes: BoothType[];
  nearby: MarketSummary[];
  /** Research/organizer facts for directory listings (null for example listings). */
  directory: DirectoryDetails | null;
}
export interface DirectoryDetails {
  state: string;
  postalCode: string;
  venueName: string;
  organizerName: string;
  contactEmail: string;
  contactPhone: string;
  socials: Record<string, string>;
  scheduleRules: ScheduleRule[];
  seasonNote: string;
  upcomingDates: string[];
  timeZone: string;
  vendorApplications: "open" | "closed" | "unknown";
  vendorApplicationUrl: string | null;
  vendorTypes: string[];
  vendorRequirements: string;
  boothPriceNote: string;
  bookingEnabled: boolean;
  coords: { latitude: number; longitude: number } | null;
  lastVerified: string | null;
  sources: { type: string; url: string; retrievedOn: string }[];
  photo: { url: string; alt: string; attribution: string; license: string } | null;
}
const distanceKm = (a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }) => {
  const r = (d: number) => (d * Math.PI) / 180;
  const h = Math.sin(r(b.latitude - a.latitude) / 2) ** 2 + Math.cos(r(a.latitude)) * Math.cos(r(b.latitude)) * Math.sin(r(b.longitude - a.longitude) / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
};

function exampleProfile(slug: string): MarketProfile | null {
  const m = demoMarkets.find((item) => item.id === slug);
  if (!m) return null;
  const nearby = demoMarkets
    .filter((item) => item.id !== m.id)
    .sort((a, b) => Math.hypot(a.pos.x - m.pos.x, a.pos.y - m.pos.y) - Math.hypot(b.pos.x - m.pos.x, b.pos.y - m.pos.y))
    .slice(0, 4)
    .map((item) => ({ slug: item.id, name: item.name, city: item.city, schedule: item.day, image: item.images[0] ?? null, example: true }));
  return {
    source: "example",
    id: null,
    slug: m.id,
    name: m.name,
    kindLabel: m.kind === "night" ? "Night market" : m.kind === "farmers" ? "Farmer's market" : "Makers fair",
    city: m.city,
    address: "",
    description: m.description,
    schedule: m.day,
    hours: m.hours,
    images: m.images,
    websiteUrl: null,
    categories: [],
    amenities: m.amenities,
    claimed: false,
    provenance: null,
    pin: m.pos,
    exampleListing: { id: m.id, price: m.price },
    vendors: [],
    boothTypes: [],
    nearby,
    directory: null,
  };
}

export async function loadMarketProfile(slug: string): Promise<MarketProfile | null> {
  const client = createPublicClient();
  if (client) {
    const { data: market, error } = await client
      .from("markets")
      .select("id,slug,name,kind,city,region,address,description,schedule,hours,vendor_categories,cover_image_url,website_url,source_name,source_url,verified_at,claim_status,partner_market_id,state,postal_code,venue_name,organizer_name,contact_email,contact_phone,social_links,schedule_rules,season_note,upcoming_dates,time_zone,vendor_applications,vendor_application_url,vendor_types,vendor_requirements,booth_price_note,amenities,booking_enabled,latitude,longitude,location_status,last_verified_at")
      .eq("slug", slug)
      .eq("published", true)
      .maybeSingle();
    // Table may not exist yet (migration pending) — fall back to example content.
    if (!error && market) {
      const coords = market.latitude != null && market.longitude != null && market.location_status === "verified" ? { latitude: market.latitude, longitude: market.longitude } : null;
      const [appearances, stalls, nearby, sources, photos] = await Promise.all([
        client
          .from("market_appearances")
          .select("appearance_date,booth_label,featured,vendor_profiles(slug,business_name,logo_url,category,product_image_urls)")
          .eq("market_id", market.id)
          .eq("status", "confirmed")
          .gte("appearance_date", todayIso())
          .order("appearance_date")
          .limit(200),
        market.partner_market_id
          ? client.from("partner_stalls").select("id,label,width_ft,depth_ft,daily_price,availability,amenities").eq("market_id", market.partner_market_id).order("daily_price")
          : Promise.resolve({ data: [], error: null }),
        client.from("markets").select("slug,name,city,state,schedule,season_note,cover_image_url,latitude,longitude").eq("published", true).eq("state", market.state).neq("id", market.id).limit(200),
        client.from("market_sources").select("source_type,url,retrieved_on").eq("market_id", market.id).order("retrieved_on", { ascending: false }),
        client.from("market_photos").select("image_url,alt_text,attribution,license").eq("market_id", market.id).eq("is_cover", true).limit(1),
      ]);
      const near = (nearby.data ?? [])
        .map((n) => ({ n, km: coords && n.latitude != null && n.longitude != null ? distanceKm(coords, { latitude: n.latitude, longitude: n.longitude }) : n.city === market.city ? 0 : Infinity }))
        .filter((x) => x.km < 160)
        .sort((a, b) => a.km - b.km)
        .slice(0, 4);
      const photo = photos.data?.[0] ?? null;
      const vendors: VendorAppearance[] = (appearances.data ?? []).flatMap((row) => {
        const v = row.vendor_profiles as unknown as { slug: string; business_name: string; logo_url: string | null; category: string; product_image_urls: string[] } | null;
        return v ? [{ date: row.appearance_date, booth: row.booth_label, featured: row.featured, vendor: { slug: v.slug, name: v.business_name, logo: v.logo_url, category: v.category, products: v.product_image_urls } }] : [];
      });
      const boothTypes: BoothType[] = (stalls.data ?? []).map((s) => ({
        id: s.id,
        label: s.label,
        size: `${s.width_ft}×${s.depth_ft} ft`,
        price: Number(s.daily_price),
        available: s.availability === "available",
        amenities: s.amenities.filter((a): a is Amenity => (amenityNames as string[]).includes(a)),
      }));
      return {
        source: "directory",
        id: market.id,
        slug: market.slug,
        name: market.name,
        kindLabel: marketKindLabel[market.kind as MarketKind] ?? "Market",
        city: market.city,
        address: market.address,
        description: market.description,
        schedule: market.schedule,
        hours: market.hours,
        images: photo ? [photo.image_url] : [],
        websiteUrl: market.website_url,
        categories: market.vendor_categories,
        amenities: [...new Set([...boothTypes.flatMap((b) => b.amenities), ...market.amenities.filter((a): a is Amenity => (amenityNames as string[]).includes(a))])],
        claimed: market.claim_status === "claimed",
        provenance: market.source_name ? { name: market.source_name, url: market.source_url, verifiedAt: market.verified_at } : null,
        pin: null,
        exampleListing: null,
        vendors,
        boothTypes,
        nearby: near.map(({ n }) => ({ slug: n.slug, name: n.name, city: `${n.city}, ${n.state}`, schedule: n.season_note || n.schedule, image: n.cover_image_url, example: false })),
        directory: {
          state: market.state,
          postalCode: market.postal_code,
          venueName: market.venue_name,
          organizerName: market.organizer_name,
          contactEmail: market.contact_email,
          contactPhone: market.contact_phone,
          socials: (market.social_links ?? {}) as Record<string, string>,
          scheduleRules: (Array.isArray(market.schedule_rules) ? market.schedule_rules : []) as unknown as ScheduleRule[],
          seasonNote: market.season_note,
          upcomingDates: market.upcoming_dates.filter((d) => d >= todayIso()).slice(0, 8),
          timeZone: market.time_zone,
          vendorApplications: market.vendor_applications as DirectoryDetails["vendorApplications"],
          vendorApplicationUrl: market.vendor_application_url,
          vendorTypes: market.vendor_types,
          vendorRequirements: market.vendor_requirements,
          boothPriceNote: market.booth_price_note,
          bookingEnabled: market.booking_enabled,
          coords,
          lastVerified: market.last_verified_at,
          sources: (sources.data ?? []).map((x) => ({ type: x.source_type, url: x.url, retrievedOn: x.retrieved_on })),
          photo: photo ? { url: photo.image_url, alt: photo.alt_text, attribution: photo.attribution, license: photo.license } : null,
        },
      };
    }
  }
  return exampleProfile(slug);
}

export interface VendorMarketDate {
  date: string;
  booth: string;
  market: { slug: string; name: string; city: string; hours: string; image: string | null };
}
export interface VendorProfilePublic {
  slug: string;
  name: string;
  category: string;
  tagline: string;
  description: string;
  serviceArea: string;
  logo: string | null;
  cover: string | null;
  products: string[];
  websiteUrl: string | null;
  instagram: string;
  email: string;
  upcoming: VendorMarketDate[];
  past: VendorMarketDate[];
}

export async function loadVendorProfile(slug: string): Promise<VendorProfilePublic | null> {
  const client = createPublicClient();
  if (!client) return null;
  const { data: v, error } = await client
    .from("vendor_profiles")
    .select("id,slug,business_name,category,tagline,description,service_area,logo_url,cover_image_url,product_image_urls,website_url,instagram_handle,contact_email,show_past_markets")
    .eq("slug", slug)
    .eq("published", true)
    .maybeSingle();
  if (error || !v) return null;
  const { data: rows } = await client
    .from("market_appearances")
    .select("appearance_date,booth_label,markets(slug,name,city,hours,cover_image_url)")
    .eq("vendor_id", v.id)
    .eq("status", "confirmed")
    .order("appearance_date")
    .limit(300);
  const today = todayIso();
  const dates: VendorMarketDate[] = (rows ?? []).flatMap((r) => {
    const m = r.markets as unknown as { slug: string; name: string; city: string; hours: string; cover_image_url: string | null } | null;
    return m ? [{ date: r.appearance_date, booth: r.booth_label, market: { slug: m.slug, name: m.name, city: m.city, hours: m.hours, image: m.cover_image_url } }] : [];
  });
  return {
    slug: v.slug,
    name: v.business_name,
    category: v.category,
    tagline: v.tagline,
    description: v.description,
    serviceArea: v.service_area,
    logo: v.logo_url,
    cover: v.cover_image_url,
    products: v.product_image_urls,
    websiteUrl: v.website_url,
    instagram: v.instagram_handle,
    email: v.contact_email,
    upcoming: dates.filter((d) => d.date >= today).slice(0, 24),
    past: v.show_past_markets ? dates.filter((d) => d.date < today).reverse().slice(0, 12) : [],
  };
}

export interface PlaceListing { slug: string; name: string; kindLabel: string; city: string; state: string; season: string; image: string | null }
export interface PlaceDirectory { state: string; city: string | null; markets: PlaceListing[]; cities: { city: string; slug: string; count: number }[] }
export const citySlug = (city: string) => city.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/** Published markets in a state (optionally one city). Returns null when nothing is published. */
export async function loadPlace(state: string, city?: string): Promise<PlaceDirectory | null> {
  const client = createPublicClient();
  if (!client) return null;
  const st = state.toUpperCase();
  const { data, error } = await client.from("markets").select("slug,name,kind,city,state,season_note,cover_image_url").eq("published", true).eq("state", st).order("name").limit(1000);
  if (error || !data?.length) return null;
  const counts = new Map<string, { city: string; count: number }>();
  for (const m of data) counts.set(citySlug(m.city), { city: m.city, count: (counts.get(citySlug(m.city))?.count ?? 0) + 1 });
  const rows = city ? data.filter((m) => citySlug(m.city) === city) : data;
  if (!rows.length) return null;
  return {
    state: st,
    city: city ? rows[0]!.city : null,
    markets: rows.map((m) => ({ slug: m.slug, name: m.name, kindLabel: marketKindLabel[m.kind as MarketKind] ?? "Market", city: m.city, state: m.state, season: m.season_note, image: m.cover_image_url })),
    cities: [...counts.entries()].map(([slug, v]) => ({ slug, ...v })).sort((a, b) => b.count - a.count || a.city.localeCompare(b.city)),
  };
}
