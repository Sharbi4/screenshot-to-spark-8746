import { markets as demoMarkets, type Amenity } from "./markets";
import { marketKindLabel, type MarketKind } from "./marketplace-schema";
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
}

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
  };
}

export async function loadMarketProfile(slug: string): Promise<MarketProfile | null> {
  const client = createPublicClient();
  if (client) {
    const { data: market, error } = await client
      .from("markets")
      .select("id,slug,name,kind,city,region,address,description,schedule,hours,vendor_categories,cover_image_url,website_url,source_name,source_url,verified_at,claim_status,partner_market_id")
      .eq("slug", slug)
      .eq("published", true)
      .maybeSingle();
    // Table may not exist yet (migration pending) — fall back to example content.
    if (!error && market) {
      const [appearances, stalls, nearby] = await Promise.all([
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
        client.from("markets").select("slug,name,city,schedule,cover_image_url").eq("published", true).eq("city", market.city).neq("id", market.id).limit(4),
      ]);
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
        images: market.cover_image_url ? [market.cover_image_url] : [],
        websiteUrl: market.website_url,
        categories: market.vendor_categories,
        amenities: [...new Set(boothTypes.flatMap((b) => b.amenities))],
        claimed: market.claim_status === "claimed",
        provenance: market.source_name ? { name: market.source_name, url: market.source_url, verifiedAt: market.verified_at } : null,
        pin: null,
        exampleListing: null,
        vendors,
        boothTypes,
        nearby: (nearby.data ?? []).map((n) => ({ slug: n.slug, name: n.name, city: n.city, schedule: n.schedule, image: n.cover_image_url, example: false })),
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
