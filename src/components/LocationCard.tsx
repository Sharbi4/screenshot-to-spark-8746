import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { MapPin, Navigation, Copy, Check, Map as MapIcon } from "lucide-react";

type Coords = { latitude: number; longitude: number };

/** Mapbox Static Images URL using the public token, in the light style with a charcoal pin. */
const staticMap = (c: Coords, token: string) =>
  `https://api.mapbox.com/styles/v1/mapbox/light-v11/static/pin-l+0e0d0b(${c.longitude},${c.latitude})/${c.longitude},${c.latitude},14,0/640x320@2x?access_token=${encodeURIComponent(token)}&attribution=true&logo=true`;

/**
 * Hands directions to the visitor's own maps app: geo: URI on Android, the native maps
 * scheme on Apple devices, otherwise copies the address. No third-party map provider is embedded.
 */
function DirectionsButton({ name, address, coords }: { name: string; address: string; coords: Coords | null }) {
  const [copied, setCopied] = useState(false);
  function go() {
    const ua = navigator.userAgent;
    const q = encodeURIComponent(address || name);
    if (/Android/i.test(ua)) window.location.href = coords ? `geo:${coords.latitude},${coords.longitude}?q=${coords.latitude},${coords.longitude}(${encodeURIComponent(name)})` : `geo:0,0?q=${q}`;
    else if (/iPhone|iPad|iPod|Macintosh/i.test(ua) && "ontouchend" in document) window.location.href = coords ? `maps://?daddr=${coords.latitude},${coords.longitude}&q=${encodeURIComponent(name)}` : `maps://?daddr=${q}`;
    else void navigator.clipboard?.writeText(address || name).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1800); });
  }
  return (
    <button type="button" onClick={go} className="tap flex shrink-0 items-center gap-1.5 text-sm font-semibold" aria-live="polite">
      {copied ? <><Check className="h-4 w-4" />Address copied</> : <><Navigation className="h-4 w-4" />Directions</>}
    </button>
  );
}

/** Compact location card in the existing stylised map language. */
export function LocationCard({ name, address, city, pin, coords = null, mapToken = "", mapSlug }: { name: string; address: string; city: string; pin: { x: number; y: number } | null; coords?: Coords | null; mapToken?: string; mapSlug?: string | undefined }) {
  const p = pin ?? { x: 50, y: 46 };
  const full = [address, city].filter(Boolean).join(", ");
  return (
    <div className="overflow-hidden rounded-3xl bg-card shadow-soft">
      {coords && mapToken ? (
        <img src={staticMap(coords, mapToken)} alt={`Map showing the location of ${name}`} loading="lazy" className="h-44 w-full bg-map-land object-cover" />
      ) : (
        <div className="relative h-44 bg-map-land">
          <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid slice" viewBox="0 0 100 100" aria-hidden>
            <path d="M-5 62 C 20 55, 35 70, 55 64 S 90 52, 105 58 L105 66 C 85 60, 70 72, 55 72 S 20 63, -5 70Z" className="fill-map-water" />
            <ellipse cx="22" cy="80" rx="14" ry="9" className="fill-map-park" />
            <ellipse cx="78" cy="18" rx="12" ry="8" className="fill-map-park" />
            <g className="stroke-map-road" strokeLinecap="round" fill="none">
              {[15, 35, 50, 70, 88].map((x) => <line key={x} x1={x} y1="-5" x2={x + 4} y2="105" strokeWidth="1.4" />)}
              {[20, 44, 82].map((y) => <line key={y} x1="-5" y1={y} x2="105" y2={y - 3} strokeWidth="1.4" />)}
              <path d="M-5 30 Q 50 48 105 36" strokeWidth="2.6" />
            </g>
          </svg>
          <span style={{ left: `${p.x}%`, top: `${p.y}%` }} className="pulse-ring absolute isolate -translate-x-1/2 -translate-y-1/2 rounded-full bg-honey p-2 text-honey-foreground shadow-float">
            <MapPin className="h-4 w-4" />
          </span>
        </div>
      )}
      <div className="flex items-center justify-between gap-3 px-5 py-4">
        <span className="min-w-0">
          <span className="block truncate font-medium">{address || city}</span>
          {address && <span className="block truncate text-sm text-muted-foreground">{city}</span>}
        </span>
        <span className="flex shrink-0 items-center gap-4">
          {mapSlug && coords && (
            <Link to="/map" search={{ focus: mapSlug }} className="tap flex items-center gap-1.5 text-sm font-semibold"><MapIcon className="h-4 w-4" />Map</Link>
          )}
          <DirectionsButton name={name} address={full} coords={coords} />
        </span>
      </div>
      {!coords && address && (
        <p className="flex items-center gap-1.5 border-t px-5 py-3 text-xs text-muted-foreground"><Copy className="h-3.5 w-3.5" />Map pin pending verification; use the address above.</p>
      )}
    </div>
  );
}
