# Import report — batch-001 (stage)

Generated 2026-11-09 · dataset sha256 `e7882855f757` · geocoder: US Census only (Mapbox token not configured)

> Nothing has been written to the database. Apply the SQL through Lovable after review.

| Metric | Count |
| --- | --- |
| researched | 16 |
| verified | 15 |
| needs review | 1 |
| ready to stage | 15 |
| would publish | 0 |
| on map | 7 |
| inserts | 16 |
| updates | 0 |
| skipped claimed | 0 |
| skipped duplicates | 0 |
| blocking flags | 2 |
| warnings | 10 |
| invalid | 0 |

## Records

| Market | City | Category | Location | Review | Action |
| --- | --- | --- | --- | --- | --- |
| Dane County Farmers' Market: Saturday on the Square | Madison, WI | farmers | pending | staged | insert |
| Dane County Farmers' Market: Wednesday Market | Madison, WI | farmers | verified (us_census) | staged | insert |
| Dane County Farmers' Market: Holiday Market | Madison, WI | holiday | verified (us_census) | staged | insert |
| Crescent City Farmers Market: Uptown Tuesday Market | New Orleans, LA | farmers | pending | staged | insert |
| Crescent City Farmers Market: Mid-City Thursday Market | New Orleans, LA | farmers | pending | staged | insert |
| Crescent City Farmers Market: City Park Sunday Market | New Orleans, LA | farmers | pending | staged | insert |
| Portland Farmers Market at PSU | Portland, OR | farmers | verified (us_census) | staged | insert |
| Findlay Market | Cincinnati, OH | public | pending | staged | insert |
| Queens Night Market | Queens, NY | night | pending | staged | insert |
| Brooklyn Flea (DUMBO) | Brooklyn, NY | flea | verified (us_census) | staged | insert |
| Chelsea Flea | New York, NY | flea | verified (us_census) | staged | insert |
| Santa Fe Farmers' Market | Santa Fe, NM | farmers | pending | staged | insert |
| Railyard Artisan Market | Santa Fe, NM | artisan | pending | staged | insert |
| Boston Public Market | Boston, MA | public | verified (us_census) | staged | insert |
| Minneapolis Farmers Market | Minneapolis, MN | farmers | pending | needs_review | insert |
| Rose Bowl Flea Market | Pasadena, CA | flea | verified (us_census) | staged | insert |

## Flags

- **warning** · `us-wi-madison-dcfm-saturday-on-the-square` · location: Address could not be geocoded; hidden from the map until a pin is confirmed.
- **warning** · `us-la-new-orleans-crescent-city-uptown-tuesday` · location: Address could not be geocoded; hidden from the map until a pin is confirmed.
- **warning** · `us-la-new-orleans-crescent-city-mid-city-thursday` · location: Address could not be geocoded; hidden from the map until a pin is confirmed.
- **warning** · `us-la-new-orleans-crescent-city-city-park-sunday` · location: Address could not be geocoded; hidden from the map until a pin is confirmed.
- **warning** · `us-oh-cincinnati-findlay-market` · location: Address could not be geocoded; hidden from the map until a pin is confirmed.
- **warning** · `us-ny-queens-queens-night-market` · location: No street address published; hidden from the map until a pin is placed manually.
- **warning** · `us-nm-santa-fe-santa-fe-farmers-market` · location: Address could not be geocoded; hidden from the map until a pin is confirmed.
- **warning** · `us-nm-santa-fe-railyard-artisan-market` · location: Address could not be geocoded; hidden from the map until a pin is confirmed.
- **blocking** · `us-mn-minneapolis-minneapolis-farmers-market` · verification: Record marked needs_review by researcher.
- **blocking** · `us-mn-minneapolis-minneapolis-farmers-market` · schedule: No verified operating schedule.
- **warning** · `us-mn-minneapolis-minneapolis-farmers-market` · location: Address could not be geocoded; hidden from the map until a pin is confirmed.
- **warning** · `us-ca-pasadena-rose-bowl-flea-market` · schedule: Opening hours not published; page shows 'check website for hours'.
