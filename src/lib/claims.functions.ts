import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { marketClaimSchema } from "./marketplace-schema";

const claimColumns = "id,market_id,full_name,role_title,work_email,phone,evidence,status,reviewer_notes,reviewed_at,created_at";

/** The signed-in user's most recent claim for a market, plus whether they already own it. */
export const getMyMarketClaim = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ market_id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const [{ data: claim, error }, { data: market }] = await Promise.all([
      context.supabase.from("market_claims").select(claimColumns).eq("market_id", data.market_id).eq("claimant_id", context.userId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      context.supabase.from("markets").select("owner_id").eq("id", data.market_id).maybeSingle(),
    ]);
    if (error) throw new Error("Could not load your claim status.");
    return { claim, isOwner: market?.owner_id === context.userId };
  });

export const submitMarketClaim = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => marketClaimSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: market, error: marketError } = await context.supabase.from("markets").select("id,claim_status").eq("id", data.market_id).maybeSingle();
    if (marketError || !market) throw new Error("Market not found.");
    if (market.claim_status !== "unclaimed") throw new Error("This market is already managed by a verified Market Partner.");
    const { attest: _attest, ...values } = data;
    const { error } = await context.supabase.from("market_claims").insert({ ...values, claimant_id: context.userId, status: "pending" });
    // 23505: an open claim already exists for this user and market — treat as success (idempotent resubmit).
    if (error && error.code !== "23505") throw new Error("Could not submit your claim. Please try again.");
    return { ok: true };
  });

export const withdrawMarketClaim = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("market_claims").update({ status: "withdrawn" }).eq("id", data.id).eq("claimant_id", context.userId).eq("status", "pending");
    if (error) throw new Error("Could not withdraw this claim.");
    return { ok: true };
  });
