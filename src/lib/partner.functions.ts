import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { profileSchema, marketSchema, stallSchema } from "./partner-schema";

export const getPartner = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { data: profile, error } = await context.supabase.from("profiles").select("*").eq("id", context.userId).maybeSingle();
  if (error) throw new Error("Could not load your profile.");
  const { data: markets, error: marketError } = await context.supabase.from("partner_markets").select("*, partner_stalls(*)").eq("owner_id", context.userId).order("created_at");
  if (marketError) throw new Error("Could not load your markets.");
  return { profile, markets: markets ?? [] };
});
export const savePartner = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((input: unknown) => profileSchema.parse(input)).handler(async ({ data, context }) => {
  const { error } = await context.supabase.from("profiles").upsert({ ...data, id: context.userId, onboarding_complete: true });
  if (error) throw new Error("Could not save your profile.");
  return { ok: true };
});
export const addMarket = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((input: unknown) => marketSchema.parse(input)).handler(async ({ data, context }) => {
  const { error } = await context.supabase.from("partner_markets").insert({ ...data, owner_id: context.userId });
  if (error) throw new Error("Could not save this market.");
  return { ok: true };
});
export const saveStall = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((input: unknown) => stallSchema.parse(input)).handler(async ({ data, context }) => {
  const { data: market } = await context.supabase.from("partner_markets").select("id").eq("id", data.market_id).eq("owner_id", context.userId).maybeSingle();
  if (!market) throw new Error("You cannot manage this market.");
  const { id, ...values } = data;
  const result = id ? await context.supabase.from("partner_stalls").update(values).eq("id", id).eq("market_id", data.market_id) : await context.supabase.from("partner_stalls").insert(values);
  if (result.error) throw new Error("Could not save this stall.");
  return { ok: true };
});