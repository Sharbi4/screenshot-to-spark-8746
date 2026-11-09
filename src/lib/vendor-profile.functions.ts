import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { appearanceSchema, vendorProfileSchema } from "./marketplace-schema";

const UNAVAILABLE = "Public profiles are being set up. Please check back shortly.";
const missingTable = (code?: string) => code === "42P01" || code === "PGRST205";

export const getMyVendorProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.from("vendor_profiles").select("*").eq("owner_id", context.userId).maybeSingle();
    if (error) return { available: !missingTable(error.code), profile: null };
    return { available: true, profile: data };
  });

export const saveMyVendorProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => vendorProfileSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("vendor_profiles")
      .upsert({ ...data, owner_id: context.userId, updated_at: new Date().toISOString() }, { onConflict: "owner_id" });
    if (error?.code === "23505") throw new Error("That profile address is taken. Try another.");
    if (error) throw new Error(missingTable(error.code) ? UNAVAILABLE : "Could not save your public profile.");
    return { ok: true };
  });

/** Markets the signed-in organizer controls after verification, with upcoming appearances. */
export const getMyVerifiedMarkets = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("markets")
      .select("id,slug,name,city,market_appearances(id,appearance_date,booth_label,featured,status,vendor_profiles(slug,business_name))")
      .eq("owner_id", context.userId)
      .order("name");
    if (error) return [];
    const today = new Date().toISOString().slice(0, 10);
    return (data ?? []).map((m) => ({
      id: m.id,
      slug: m.slug,
      name: m.name,
      city: m.city,
      appearances: (m.market_appearances ?? [])
        .filter((a) => a.status === "confirmed" && a.appearance_date >= today)
        .sort((a, b) => a.appearance_date.localeCompare(b.appearance_date))
        .map((a) => {
          const v = a.vendor_profiles as unknown as { slug: string; business_name: string } | null;
          return { id: a.id, date: a.appearance_date, booth: a.booth_label, featured: a.featured, vendor: v ? { slug: v.slug, name: v.business_name } : null };
        }),
    }));
  });

export const confirmVendorAppearance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => appearanceSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: market } = await context.supabase.from("markets").select("id").eq("id", data.market_id).eq("owner_id", context.userId).maybeSingle();
    if (!market) throw new Error("Only the verified organizer can confirm vendors for this market.");
    const { data: vendor } = await context.supabase.from("vendor_profiles").select("id").eq("slug", data.vendor_slug).eq("published", true).maybeSingle();
    if (!vendor) throw new Error("No published vendor profile at that address.");
    const { error } = await context.supabase.from("market_appearances").upsert(
      { market_id: data.market_id, vendor_id: vendor.id, appearance_date: data.appearance_date, booth_label: data.booth_label, featured: data.featured, status: "confirmed", source: "organizer" },
      { onConflict: "market_id,vendor_id,appearance_date" },
    );
    if (error) throw new Error("Could not confirm this vendor.");
    return { ok: true };
  });

export const cancelVendorAppearance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    // RLS restricts this to appearances at markets the caller owns.
    const { error } = await context.supabase.from("market_appearances").update({ status: "cancelled" }).eq("id", data.id);
    if (error) throw new Error("Could not cancel this appearance.");
    return { ok: true };
  });
