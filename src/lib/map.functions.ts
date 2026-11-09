import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { MapListing } from "./map-style";

/**
 * Browser map configuration. The token returned is a PUBLIC (pk.*) Mapbox token, URL-restricted to the
 * MarketBloom domains in the Mapbox dashboard. It is read from runtime secrets, never committed.
 * Secret (sk.*) tokens are used only by the import script for permanent geocoding.
 */
export const getMapConfig = createServerFn({ method: "GET" }).handler(async () => {
  const token = process.env["MAPBOX_PUBLIC_TOKEN"] ?? "";
  return { token: token.startsWith("pk.") ? token : "" };
});

const bbox = z.object({
  west: z.number().min(-180).max(180),
  south: z.number().min(-90).max(90),
  east: z.number().min(-180).max(180),
  north: z.number().min(-90).max(90),
});

/** Published, location-verified listings inside a bounding box (geographic pagination). */
export const getMapListings = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => bbox.parse(input))
  .handler(async ({ data }): Promise<{ listings: MapListing[]; truncated: boolean }> => {
    const { createPublicClient } = await import("./supabase-public.server");
    const client = createPublicClient();
    if (!client) return { listings: [], truncated: false };
    const limit = 5000;
    const { data: rows, error } = await client.rpc("map_listings", { min_lng: data.west, min_lat: data.south, max_lng: data.east, max_lat: data.north, max_rows: limit });
    if (error || !rows) return { listings: [], truncated: false }; // e.g. migration not yet applied
    return { listings: rows.map((r) => ({ ...r, listing_type: r.listing_type === "spot" ? "spot" : "market" })), truncated: rows.length >= limit };
  });
