import { createServerFn } from "@tanstack/react-start";
import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { bookingRequestSchema } from "./booking-schema";
import { getMarket } from "./markets";

export const createBookingRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => bookingRequestSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: existing, error: readError } = await context.supabase.from("booking_requests").select("id").eq("owner_id", context.userId).eq("request_key", data.request_key).maybeSingle();
    if (readError) throw new Error("Could not check this request. Please try again.");
    if (existing) return existing;
    let details: { market_id: string; stall_id?: string; market_name: string; city: string; hours: string; stall_label: string; daily_price: number };
    if (data.stall_id) {
      const { data: stall, error } = await context.supabase.from("partner_stalls").select("market_id,label,daily_price,availability").eq("id", data.stall_id).maybeSingle();
      if (error || !stall || stall.availability !== "available") throw new Error("This stall is not available for requests.");
      // Market identity is private to its organizer; stall requests snapshot only public stall fields.
      details = { market_id: stall.market_id, stall_id: data.stall_id, market_name: "Marketpartner stall", city: "", hours: "", stall_label: stall.label, daily_price: stall.daily_price };
    } else {
      const market = data.market_id ? getMarket(data.market_id) : undefined;
      if (!market) throw new Error("Market not found.");
      details = { market_id: market.id, market_name: market.name, city: market.city, hours: market.hours, stall_label: "Space requested · stall not assigned", daily_price: market.price };
    }
    const { data: booking, error } = await context.supabase.from("booking_requests").upsert({ ...details, owner_id: context.userId, request_key: data.request_key, booking_date: data.booking_date, notes: data.notes, status: "Pending" }, { onConflict: "owner_id,request_key", ignoreDuplicates: true }).select("id").maybeSingle();
    if (error) throw new Error("Could not save your booking request. Please try again.");
    if (booking) return booking;
    const { data: duplicate } = await context.supabase.from("booking_requests").select("id").eq("owner_id", context.userId).eq("request_key", data.request_key).maybeSingle();
    if (!duplicate) throw new Error("Could not confirm your request. Please try again.");
    return duplicate;
  });

export const listBookingRequests = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { data, error } = await context.supabase.from("booking_requests").select("*").eq("owner_id", context.userId).order("created_at", { ascending: false });
  if (error) throw new Error("Could not load your booking requests.");
  return data ?? [];
});

export const bookingRequestsOptions = (userId: string) => queryOptions({ queryKey: ["booking-requests", userId], queryFn: () => listBookingRequests() });

export const getSavedBookingSummary = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: booking, error } = await context.supabase.from("booking_requests").select("*").eq("id", data.id).eq("owner_id", context.userId).maybeSingle();
    if (error || !booking) throw new Error("Booking request not found.");
    const { summarizeBookingDetails } = await import("./booking-summary.server");
    return summarizeBookingDetails({ market: booking.market_name, city: booking.city, hours: booking.hours, date: booking.booking_date, stall: booking.stall_label, status: booking.status, dailyPriceUSD: booking.daily_price, notes: booking.notes });
  });