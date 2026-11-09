import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { LoaderCircle, MapPin } from "lucide-react";
import { getMapListings } from "@/lib/map.functions";
import { US_BOUNDS } from "@/lib/map-style";
import { markets } from "@/lib/markets";
import { MarketCard } from "@/components/MarketCard";
import type { Place } from "@/components/LocationPicker";

const PHOENIX = { latitude: 33.4484, longitude: -112.074 }; // all sample markets are in the Phoenix area
const RADIUS_MI = 60;

function miles(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }) {
  const r = (d: number) => (d * Math.PI) / 180;
  const h = Math.sin(r(b.latitude - a.latitude) / 2) ** 2 + Math.cos(r(a.latitude)) * Math.cos(r(b.latitude)) * Math.sin(r(b.longitude - a.longitude) / 2) ** 2;
  return 3959 * 2 * Math.asin(Math.sqrt(h));
}

export function NearbyMarkets({ place }: { place: Place }) {
  const fetchListings = useServerFn(getMapListings);
  const box = place
    ? { west: place.longitude - 1.2, east: place.longitude + 1.2, south: place.latitude - 0.9, north: place.latitude + 0.9 }
    : { west: US_BOUNDS[0][0], south: US_BOUNDS[0][1], east: US_BOUNDS[1][0], north: US_BOUNDS[1][1] };
  const { data, isLoading } = useQuery({ queryKey: ["home-listings", box], queryFn: () => fetchListings({ data: box }), staleTime: 60_000 });

  const listings = (data?.listings ?? [])
    .map((l) => ({ ...l, dist: place ? miles(place, l) : 0 }))
    .filter((l) => !place || l.dist <= RADIUS_MI)
    .sort((a, b) => a.dist - b.dist);
  const showSamples = !place || miles(place, PHOENIX) <= RADIUS_MI;

  return (
    <section>
      <div className="px-5">
        <p className="eyebrow text-muted-foreground">{place ? `Within ${RADIUS_MI} miles` : "Across the country"}</p>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight">{place ? `Markets near ${place.label}` : "Markets nationwide"}</h2>
      </div>
      {isLoading ? (
        <p className="mt-4 flex items-center gap-2 px-5 text-sm text-muted-foreground"><LoaderCircle className="h-4 w-4 animate-spin" /> Finding markets…</p>
      ) : (
        <div className="no-scrollbar mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-5 px-5 pb-2">
          {listings.map((l) => (
            <Link key={l.slug} to="/m/$slug" params={{ slug: l.slug }} className="tap shadow-soft w-64 shrink-0 snap-start overflow-hidden rounded-3xl bg-card">
              {l.cover_image_url ? <img src={l.cover_image_url} alt="" className="h-36 w-full object-cover" /> : <div className="flex h-36 items-end bg-scrim p-3"><MapPin className="h-5 w-5 text-on-scrim" /></div>}
              <div className="p-3.5">
                <p className="font-semibold tracking-tight">{l.name}</p>
                <p className="text-sm text-muted-foreground">{l.city}, {l.state}{place ? ` · ${Math.round(l.dist)} mi` : ""}</p>
              </div>
            </Link>
          ))}
          {showSamples && markets.map((m) => <MarketCard key={m.id} m={m} />)}
          {!listings.length && !showSamples && (
            <div className="w-full rounded-3xl bg-secondary p-5 text-sm text-muted-foreground">
              No markets listed near {place?.label} yet. <Link to="/map" className="font-semibold text-foreground underline">Browse the map</Link>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
