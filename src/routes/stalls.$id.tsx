import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { BookingRequest } from "@/components/BookingRequest";
import { Amenities } from "@/components/Amenities";
import type { Amenity } from "@/lib/markets";
import type { Database } from "@/integrations/supabase/types";
const getStall = createServerFn({ method: "GET" }).inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input)).handler(async ({ data }) => {
  const { createClient } = await import("@supabase/supabase-js");
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]; const url = process.env["SUPABASE_URL"];
  if (!key || !url) throw new Error("Stall details unavailable.");
  const client = createClient<Database>(url, key, { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: (input, init) => { const headers = new Headers(init?.headers); if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) headers.delete("Authorization"); headers.set("apikey", key); return fetch(input, { ...init, headers }); } } });
  const { data: stall, error } = await client.from("partner_stalls").select("id,label,width_ft,depth_ft,daily_price,availability,amenities,notes").eq("id", data.id).maybeSingle();
  if (error) throw new Error("Could not load stall details.");
  return stall;
});
export const Route = createFileRoute("/stalls/$id")({ loader: async ({ params }) => { const stall = await getStall({ data: { id: params.id } }); if (!stall) throw notFound(); return stall; }, head: ({ loaderData }) => ({ meta: [
  { title: `${loaderData?.label ?? "Stall"} — Marketpartner · Vendibook` }, { name: "description", content: "View stall dimensions, daily pricing, amenities, and availability." }, { property: "og:title", content: `${loaderData?.label ?? "Stall"} — Marketpartner · Vendibook` }, { property: "og:description", content: "Stall details and availability on Vendibook." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
] }), component: Details });
function Details() { const stall = Route.useLoaderData(); const amenities: Amenity[] = stall.amenities.filter((item: string): item is Amenity => ["power", "water", "corner", "shade", "wifi", "parking"].includes(item)); return <main className="mx-auto max-w-3xl px-5 py-10 pb-32"><Button asChild variant="link"><Link to="/partner">Back to Marketpartner</Link></Button><p className="eyebrow mt-6 text-sage">Stall details · {stall.availability}</p><h1 className="display mt-3 text-5xl">{stall.label}</h1><div className="mt-8 flex flex-wrap gap-10 border-y py-6"><div><p className="text-3xl font-semibold">{stall.width_ft} × {stall.depth_ft} ft</p><p className="mt-1 text-sm text-muted-foreground">Stall dimensions</p></div><div><p className="text-3xl font-semibold">${stall.daily_price}</p><p className="mt-1 text-sm text-muted-foreground">Per day · USD</p></div></div><h2 className="mt-8 text-xl font-semibold">Amenities</h2><div className="mt-4">{amenities.length ? <Amenities items={amenities} /> : <p className="text-muted-foreground">No amenities listed.</p>}</div>{stall.notes && <section className="mt-8"><h2 className="text-xl font-semibold">Stall notes</h2><p className="mt-3 whitespace-pre-wrap break-words text-muted-foreground">{stall.notes}</p></section>}<div className="mt-8"><BookingRequest stallId={stall.id} name={stall.label} unavailable={stall.availability !== "available"} /></div></main>; }