import { describe, expect, it } from "vitest";
import { toFeatureCollection, type MapListing } from "@/lib/map-style";

const l = (over: Partial<MapListing>): MapListing => ({ listing_type: "market", slug: "a", name: "A", kind: "farmers", city: "X", state: "WI", latitude: 43, longitude: -89, cover_image_url: null, bookable: false, from_price: null, ...over });

describe("map features", () => {
  it("never shows a price on directory-only markets", () => {
    const [f] = toFeatureCollection([l({ from_price: 40 })]).features;
    expect(f!.properties.price_label).toBe("");
    expect(f!.properties.bookable).toBe(false);
  });
  it("labels verified bookable inventory with its from-price", () => {
    const [f] = toFeatureCollection([l({ bookable: true, from_price: 85.4 })]).features;
    expect(f!.properties.price_label).toBe("$85");
  });
  it("keeps Spots distinguishable and uses [lng, lat]", () => {
    const [f] = toFeatureCollection([l({ listing_type: "spot", latitude: 39.7, longitude: -104.9 })]).features;
    expect(f!.properties.listing_type).toBe("spot");
    expect(f!.geometry.coordinates).toEqual([-104.9, 39.7]);
  });
});
