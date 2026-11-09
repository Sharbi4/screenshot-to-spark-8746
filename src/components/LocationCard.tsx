import { MapPin, ArrowUpRight } from "lucide-react";

/** Compact location card in the existing stylised map language. */
export function LocationCard({ name, address, city, pin }: { name: string; address: string; city: string; pin: { x: number; y: number } | null }) {
  const query = [address, city].filter(Boolean).join(", ") || name;
  const p = pin ?? { x: 50, y: 46 };
  return (
    <div className="overflow-hidden rounded-3xl bg-card shadow-soft">
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
        <span
          style={{ left: `${p.x}%`, top: `${p.y}%` }}
          className="pulse-ring absolute isolate -translate-x-1/2 -translate-y-1/2 rounded-full bg-honey p-2 text-honey-foreground shadow-float"
        >
          <MapPin className="h-4 w-4" />
        </span>
      </div>
      <a
        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="tap flex items-center justify-between gap-3 px-5 py-4"
      >
        <span className="min-w-0">
          <span className="block truncate font-medium">{address || city}</span>
          {address && <span className="block truncate text-sm text-muted-foreground">{city}</span>}
        </span>
        <span className="flex shrink-0 items-center gap-1 text-sm font-semibold">
          Directions <ArrowUpRight className="h-4 w-4" />
        </span>
      </a>
    </div>
  );
}
