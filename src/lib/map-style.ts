// Mapbox theme + marker layers derived from the existing design tokens in styles.css
// (oklch values converted to hex because Mapbox GL cannot parse oklch).
export const mapTheme = {
  land: "#f1f0ec", // --map-land
  water: "#c1dcea", // --map-water
  park: "#d0eacf", // --map-park
  road: "#ffffff", // --map-road
  primary: "#0e0d0b", // --primary (charcoal markers)
  onPrimary: "#f7f7f4", // --primary-foreground
  honey: "#f5af20", // --honey (selected / accent)
  honeyForeground: "#1f1306",
  sage: "#3f6948", // --sage (Spots)
  label: "#65635e", // --muted-foreground
} as const;

export const MAP_BASE_STYLE = "mapbox://styles/mapbox/light-v11";
export const US_BOUNDS: [[number, number], [number, number]] = [[-125, 24], [-66.5, 49.5]];

export type ListingType = "market" | "spot";
export interface MapListing {
  listing_type: ListingType;
  slug: string;
  name: string;
  kind: string;
  city: string;
  state: string;
  latitude: number;
  longitude: number;
  cover_image_url: string | null;
  bookable: boolean;
  from_price: number | null;
}

/** GeoJSON for a clustered source. Price label only for verified, bookable inventory. */
export function toFeatureCollection(listings: MapListing[]) {
  return {
    type: "FeatureCollection" as const,
    features: listings.map((l) => ({
      type: "Feature" as const,
      id: l.slug,
      geometry: { type: "Point" as const, coordinates: [l.longitude, l.latitude] },
      properties: {
        slug: l.slug,
        listing_type: l.listing_type,
        kind: l.kind,
        bookable: Boolean(l.bookable && l.from_price != null),
        price_label: l.bookable && l.from_price != null ? `$${Math.round(l.from_price)}` : "",
      },
    })),
  };
}

const isBookable = ["==", ["get", "bookable"], true];
const notCluster = ["!", ["has", "point_count"]];

/** Layer specs (Mapbox style spec JSON) — WebGL layers, no per-marker DOM nodes. */
export function markerLayers(sourceId: string, selectedSlug: string | null) {
  const selected = ["==", ["get", "slug"], selectedSlug ?? ""];
  return [
    {
      id: "mb-clusters",
      type: "circle",
      source: sourceId,
      filter: ["has", "point_count"],
      paint: {
        "circle-color": mapTheme.primary,
        "circle-radius": ["step", ["get", "point_count"], 16, 10, 20, 50, 26, 250, 32],
        "circle-stroke-width": 3,
        "circle-stroke-color": "rgba(255,255,255,0.85)",
      },
    },
    {
      id: "mb-cluster-count",
      type: "symbol",
      source: sourceId,
      filter: ["has", "point_count"],
      layout: { "text-field": ["get", "point_count_abbreviated"], "text-size": 13, "text-font": ["DIN Pro Medium", "Arial Unicode MS Regular"] },
      paint: { "text-color": mapTheme.onPrimary },
    },
    // Directory markets: charcoal dot with a honey core. Spots: sage ring. Selected: honey.
    {
      id: "mb-directory",
      type: "circle",
      source: sourceId,
      filter: ["all", notCluster, ["!", isBookable]],
      paint: {
        "circle-color": ["case", selected, mapTheme.honey, ["==", ["get", "listing_type"], "spot"], mapTheme.sage, mapTheme.primary],
        "circle-radius": ["case", selected, 11, 8],
        "circle-stroke-width": 3,
        "circle-stroke-color": "#ffffff",
      },
    },
    {
      id: "mb-directory-core",
      type: "circle",
      source: sourceId,
      filter: ["all", notCluster, ["!", isBookable]],
      paint: { "circle-color": ["case", selected, mapTheme.honeyForeground, mapTheme.honey], "circle-radius": ["case", selected, 3.5, 3] },
    },
    // Bookable inventory: the prototype's dark rounded price pill (honey when selected).
    {
      id: "mb-price",
      type: "symbol",
      source: sourceId,
      filter: ["all", notCluster, isBookable],
      layout: {
        "icon-image": ["case", selected, "mb-pill-honey", "mb-pill-dark"],
        "icon-text-fit": "both",
        "icon-text-fit-padding": [5, 10, 5, 10],
        "icon-allow-overlap": true,
        "text-allow-overlap": true,
        "text-field": ["get", "price_label"],
        "text-size": 13,
        "text-font": ["DIN Pro Bold", "Arial Unicode MS Bold"],
      },
      paint: { "text-color": ["case", selected, mapTheme.honeyForeground, mapTheme.onPrimary] },
    },
  ] as const;
}

/** A stretchable rounded-pill image (drawn once) for icon-text-fit price markers. */
export function pillImage(color: string, pixelRatio = 2) {
  const w = 40 * pixelRatio, h = 28 * pixelRatio, r = h / 2;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(r, 0);
  ctx.arcTo(w, 0, w, h, r);
  ctx.arcTo(w, h, 0, h, r);
  ctx.arcTo(0, h, 0, 0, r);
  ctx.arcTo(0, 0, w, 0, r);
  ctx.fill();
  return {
    image: ctx.getImageData(0, 0, w, h),
    options: { pixelRatio, stretchX: [[r, w - r]] as [number, number][], stretchY: [[r - 1, r + 1]] as [number, number][], content: [r * 0.8, 4, w - r * 0.8, h - 4] as [number, number, number, number] },
  };
}

/** Tint the Mapbox light basemap to the MarketBloom palette. Unknown layers are ignored. */
export function applyTheme(map: { getStyle: () => { layers?: { id: string; type: string }[] }; setPaintProperty: (id: string, p: string, v: unknown) => void }) {
  for (const layer of map.getStyle().layers ?? []) {
    try {
      if (layer.type === "background") map.setPaintProperty(layer.id, "background-color", mapTheme.land);
      else if (layer.id.startsWith("land") && layer.type === "fill") map.setPaintProperty(layer.id, "fill-color", mapTheme.land);
      else if (layer.id.includes("water") && layer.type === "fill") map.setPaintProperty(layer.id, "fill-color", mapTheme.water);
      else if (/park|national-park|landuse/.test(layer.id) && layer.type === "fill") map.setPaintProperty(layer.id, "fill-color", mapTheme.park);
      else if (layer.id.startsWith("road") && layer.type === "line") map.setPaintProperty(layer.id, "line-color", mapTheme.road);
    } catch {
      /* layer without that property */
    }
  }
}
