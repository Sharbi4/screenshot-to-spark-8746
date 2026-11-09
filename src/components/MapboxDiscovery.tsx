import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, LoaderCircle, Navigation, Search, X } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import type { Map as MapboxMap, GeoJSONSource, MapMouseEvent } from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { getMapListings } from "@/lib/map.functions";
import { MAP_BASE_STYLE, US_BOUNDS, applyTheme, mapTheme, markerLayers, pillImage, toFeatureCollection, type MapListing } from "@/lib/map-style";
import { marketKindLabel, type MarketKind } from "@/lib/marketplace-schema";

const SOURCE = "mb-listings";
type Feat = { properties?: Record<string, unknown> | null; geometry: { type: string; coordinates: unknown } };
const filters = [
  { id: "all", label: "All" },
  { id: "farmers", label: "Farmers" },
  { id: "night", label: "Night" },
  { id: "flea", label: "Flea" },
  { id: "artisan", label: "Makers" },
  { id: "public", label: "Public" },
  { id: "holiday", label: "Holiday" },
  { id: "food_truck", label: "Food trucks" },
  { id: "spot", label: "Spots" },
] as const;
type FilterId = (typeof filters)[number]["id"];

const matches = (l: MapListing, f: FilterId) => f === "all" || (f === "spot" ? l.listing_type === "spot" : l.listing_type === "market" && (l.kind === f || (f === "artisan" && l.kind === "craft")));

export function MapboxDiscovery({ token }: { token: string }) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapboxMap | null>(null);
  const fetchListings = useServerFn(getMapListings);
  const [listings, setListings] = useState<MapListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterId>("all");
  const [selected, setSelected] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState("");
  const visible = useMemo(() => listings.filter((l) => matches(l, filter)), [listings, filter]);
  const sel = useMemo(() => listings.find((l) => l.slug === selected) ?? null, [listings, selected]);

  const load = useCallback(async () => {
    const map = mapRef.current;
    if (!map) return;
    const b = map.getBounds();
    if (!b) return;
    setLoading(true);
    try {
      // Pad the viewport so small pans don't refetch; clamp to valid ranges.
      const padX = (b.getEast() - b.getWest()) * 0.25, padY = (b.getNorth() - b.getSouth()) * 0.25;
      const res = await fetchListings({ data: { west: Math.max(-180, b.getWest() - padX), south: Math.max(-90, b.getSouth() - padY), east: Math.min(180, b.getEast() + padX), north: Math.min(90, b.getNorth() + padY) } });
      setListings(res.listings);
    } catch {
      setNotice("Couldn't load markets. Pan the map to retry.");
    } finally {
      setLoading(false);
    }
  }, [fetchListings]);

  // Create the map once (client only).
  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    void import("mapbox-gl").then(({ default: mapboxgl }) => {
      if (cancelled || !container.current) return;
      mapboxgl.accessToken = token;
      const map = new mapboxgl.Map({ container: container.current, style: MAP_BASE_STYLE, bounds: US_BOUNDS, fitBoundsOptions: { padding: 24 }, attributionControl: false, dragRotate: false, pitchWithRotate: false, touchPitch: false });
      map.touchZoomRotate.disableRotation();
      map.addControl(new mapboxgl.AttributionControl({ compact: true }), "bottom-left");
      mapRef.current = map;
      map.on("style.load", () => {
        applyTheme(map as unknown as Parameters<typeof applyTheme>[0]);
        for (const [id, color] of [["mb-pill-dark", mapTheme.primary], ["mb-pill-honey", mapTheme.honey]] as const) {
          const { image, options } = pillImage(color);
          if (!map.hasImage(id)) map.addImage(id, image, options);
        }
        map.addSource(SOURCE, { type: "geojson", data: toFeatureCollection([]), cluster: true, clusterRadius: 50, clusterMaxZoom: 11 });
        for (const layer of markerLayers(SOURCE, null)) map.addLayer(layer as unknown as Parameters<MapboxMap["addLayer"]>[0]);
        void load();
      });
      map.on("moveend", () => {
        clearTimeout(timer);
        timer = setTimeout(() => void load(), 350);
      });
      map.on("click", "mb-clusters", (e: MapMouseEvent) => {
        const f = map.queryRenderedFeatures(e.point, { layers: ["mb-clusters"] })[0] as unknown as Feat | undefined;
        const id = f?.properties?.["cluster_id"] as number | undefined;
        if (!f || id == null) return;
        (map.getSource(SOURCE) as GeoJSONSource).getClusterExpansionZoom(id, (err, zoom) => {
          if (!err && f.geometry.type === "Point") map.easeTo({ center: f.geometry.coordinates as [number, number], zoom: zoom ?? map.getZoom() + 2 });
        });
      });
      for (const layer of ["mb-directory", "mb-price"]) {
        map.on("click", layer, (e: MapMouseEvent) => {
          const slug = (e.features?.[0] as unknown as Feat | undefined)?.properties?.["slug"];
          if (typeof slug === "string") setSelected(slug);
        });
        map.on("mouseenter", layer, () => (map.getCanvas().style.cursor = "pointer"));
        map.on("mouseleave", layer, () => (map.getCanvas().style.cursor = ""));
      }
      map.on("mouseenter", "mb-clusters", () => (map.getCanvas().style.cursor = "pointer"));
      map.on("mouseleave", "mb-clusters", () => (map.getCanvas().style.cursor = ""));
    });
    return () => {
      cancelled = true;
      clearTimeout(timer);
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [token, load]);

  // Push data + selection styling into the WebGL layers.
  useEffect(() => {
    const map = mapRef.current;
    const source = map?.getSource(SOURCE) as GeoJSONSource | undefined;
    if (!map || !source) return;
    source.setData(toFeatureCollection(visible));
    for (const layer of markerLayers(SOURCE, selected)) {
      for (const [k, v] of Object.entries((layer as { paint?: Record<string, unknown> }).paint ?? {})) map.setPaintProperty(layer.id, k as never, v as never);
      const icon = (layer as { layout?: Record<string, unknown> }).layout?.["icon-image"];
      if (icon) map.setLayoutProperty(layer.id, "icon-image", icon as never);
    }
  }, [visible, selected]);

  async function search(event: React.FormEvent) {
    event.preventDefault();
    const map = mapRef.current;
    const q = query.trim();
    if (!map || !q) return;
    setNotice("");
    const local = listings.find((l) => `${l.name} ${l.city} ${l.state}`.toLowerCase().includes(q.toLowerCase()));
    if (local) {
      map.flyTo({ center: [local.longitude, local.latitude], zoom: 13 });
      setSelected(local.slug);
      return;
    }
    // City, state or ZIP via Mapbox Geocoding (temporary results; nothing is stored).
    const u = new URL("https://api.mapbox.com/search/geocode/v6/forward");
    u.search = new URLSearchParams({ q, country: "us", limit: "1", types: "postcode,place,locality,region,neighborhood", access_token: token }).toString();
    try {
      const f = (await (await fetch(u)).json()).features?.[0];
      if (!f) return setNotice(`No places found for “${q}”.`);
      const box = f.properties?.bbox as [number, number, number, number] | undefined;
      if (box) map.fitBounds([[box[0], box[1]], [box[2], box[3]]], { padding: 40, maxZoom: 12 });
      else map.flyTo({ center: f.geometry.coordinates, zoom: 11 });
    } catch {
      setNotice("Search is unavailable right now.");
    }
  }

  function locate() {
    if (!("geolocation" in navigator)) return setNotice("Location isn't available on this device.");
    navigator.geolocation.getCurrentPosition(
      (pos) => mapRef.current?.flyTo({ center: [pos.coords.longitude, pos.coords.latitude], zoom: 10 }),
      () => setNotice("Location permission was declined. Search by city or ZIP instead."),
      { enableHighAccuracy: false, timeout: 10000 },
    );
  }

  return (
    <main className="fixed inset-0 overflow-hidden bg-map-land">
      {/* mapbox-gl.css forces the container to position:relative, so size it inside an absolute wrapper. */}
      <div className="absolute inset-0">
        <div ref={container} className="h-full w-full" role="region" aria-label="Map of markets" />
      </div>

      <div className="absolute inset-x-0 top-0 z-10 space-y-2.5 p-4 pt-[max(1rem,env(safe-area-inset-top))]">
        <div className="flex items-center gap-2">
          <form onSubmit={search} className="glass shadow-soft flex flex-1 items-center gap-2 rounded-full py-1.5 pl-4 pr-1.5">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            <label className="sr-only" htmlFor="map-search">Search city, state, ZIP or market</label>
            <input id="map-search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="City, state, ZIP or market" className="min-w-0 flex-1 bg-transparent py-1 text-sm font-medium outline-none placeholder:text-muted-foreground" />
            {query && <button type="button" onClick={() => setQuery("")} className="tap rounded-full p-1.5" aria-label="Clear search"><X className="h-4 w-4" /></button>}
          </form>
          <button onClick={locate} className="tap glass shadow-soft rounded-full p-3" aria-label="Markets near me"><Navigation className="h-4 w-4" /></button>
        </div>
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4" role="toolbar" aria-label="Filter by category">
          {filters.map((f) => (
            <button key={f.id} onClick={() => setFilter(f.id)} aria-pressed={filter === f.id} className={`tap shrink-0 rounded-full px-3.5 py-2 text-[13px] font-semibold shadow-soft ${filter === f.id ? "bg-primary text-primary-foreground" : "glass"}`}>
              {f.label}
            </button>
          ))}
        </div>
        {(loading || notice || (!visible.length && !loading)) && (
          <p role="status" className="glass shadow-soft inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-xs font-medium">
            {loading ? <><LoaderCircle className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none" />Loading markets…</> : notice || "No published markets in this area yet."}
          </p>
        )}
      </div>

      <AnimatePresence>
        {sel && (
          <>
            <motion.div key="scrim" className="absolute inset-0 z-20" onClick={() => setSelected(null)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
            <motion.div
              key={sel.slug}
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.6 }}
              onDragEnd={(_, info) => info.offset.y > 100 && setSelected(null)}
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 34 }}
              className="glass shadow-float absolute inset-x-0 bottom-0 z-30 mx-auto max-h-[58vh] max-w-xl rounded-t-3xl p-4 pb-28"
            >
              <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-muted-foreground/30" />
              {sel.cover_image_url ? (
                <img src={sel.cover_image_url} alt="" className="h-44 w-full rounded-2xl object-cover" />
              ) : (
                <div className="flex h-32 items-end rounded-2xl bg-scrim p-4"><p className="display text-2xl text-on-scrim/80" aria-hidden>{sel.name}</p></div>
              )}
              <div className="mt-4 flex items-start justify-between gap-3 px-1">
                <div className="min-w-0">
                  <p className="eyebrow text-muted-foreground">{sel.city}, {sel.state} · {sel.listing_type === "spot" ? "Spot" : (marketKindLabel[sel.kind as MarketKind] ?? "Market")}</p>
                  <h2 className="mt-1 text-xl font-semibold tracking-tight">{sel.name}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">{sel.bookable ? "Book a stall on MarketBloom" : "Directory listing · hours, location & vendor info"}</p>
                </div>
                <Link to="/m/$slug" params={{ slug: sel.slug }} className="tap flex shrink-0 items-center gap-1.5 rounded-full bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground">
                  {sel.bookable && sel.from_price != null ? `$${Math.round(sel.from_price)}` : "View"} <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </main>
  );
}
