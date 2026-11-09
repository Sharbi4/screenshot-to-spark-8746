import { createFileRoute, Link } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { Star, ArrowRight, Navigation } from "lucide-react";
import { useState } from "react";
import { markets, type Market } from "@/lib/markets";
import { Gallery } from "@/components/Gallery";
import { MapboxDiscovery } from "@/components/MapboxDiscovery";
import { getMapConfig } from "@/lib/map.functions";

export const Route = createFileRoute("/map")({
  head: () => ({
    meta: [
      { title: "Market Map — Vendibook" },
      { name: "description", content: "See open vendor stalls and prices on a live market map." },
      { property: "og:title", content: "Market Map — Vendibook" },
      { property: "og:description", content: "See open vendor stalls and prices on a live market map." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: () => getMapConfig(),
  component: MapRoute,
});

// Mapbox when a public token is configured; otherwise the original stylised prototype map.
function MapRoute() {
  const { token } = Route.useLoaderData();
  return token ? <MapboxDiscovery token={token} /> : <MapView />;
}

function MapView() {
  const [sel, setSel] = useState<Market | null>(null);
  return (
    <main className="fixed inset-0 overflow-hidden bg-map-land">
      <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid slice" viewBox="0 0 100 100" aria-hidden>
        <path d="M-5 62 C 20 55, 35 70, 55 64 S 90 52, 105 58 L105 66 C 85 60, 70 72, 55 72 S 20 63, -5 70Z" className="fill-map-water" />
        <ellipse cx="22" cy="80" rx="14" ry="9" className="fill-map-park" />
        <ellipse cx="78" cy="18" rx="12" ry="8" className="fill-map-park" />
        <circle cx="48" cy="12" r="6" className="fill-map-park" />
        <g className="stroke-map-road" strokeLinecap="round" fill="none">
          {[15, 35, 50, 70, 88].map((x) => <line key={`v${x}`} x1={x} y1="-5" x2={x + 4} y2="105" strokeWidth="1.4" />)}
          {[20, 44, 82].map((y) => <line key={`h${y}`} x1="-5" y1={y} x2="105" y2={y - 3} strokeWidth="1.4" />)}
          <path d="M-5 30 Q 50 48 105 36" strokeWidth="2.6" />
        </g>
      </svg>

      <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between p-4 pt-[max(1rem,env(safe-area-inset-top))]">
        <div className="glass shadow-soft rounded-full px-4 py-2.5">
          <p className="text-sm font-semibold tracking-tight">Phoenix Valley</p>
        </div>
        <button className="tap glass shadow-soft rounded-full p-3" aria-label="Locate me"><Navigation className="h-4 w-4" /></button>
      </div>

      {markets.map((m, i) => {
        const active = sel?.id === m.id;
        return (
          <motion.button
            key={m.id}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: active ? 1.15 : 1, opacity: 1 }}
            transition={{ delay: 0.15 + i * 0.06, type: "spring", stiffness: 400, damping: 20 }}
            whileTap={{ scale: 0.92 }}
            onClick={() => setSel(m)}
            style={{ left: `${m.pos.x}%`, top: `${m.pos.y}%` }}
            className={`absolute isolate -translate-x-1/2 -translate-y-1/2 rounded-full px-3 py-1.5 text-[13px] font-semibold shadow-float ${
              active ? "bg-honey text-honey-foreground pulse-ring" : "bg-primary text-primary-foreground"
            }`}
          >
            ${m.price}
          </motion.button>
        );
      })}

      <AnimatePresence>
        {sel && (
          <>
            <motion.div key="scrim" className="absolute inset-0 z-20" onClick={() => setSel(null)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
            <motion.div
              key={sel.id}
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.6 }}
              onDragEnd={(_, info) => info.offset.y > 100 && setSel(null)}
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 34 }}
              className="glass shadow-float absolute inset-x-0 bottom-0 z-30 mx-auto max-h-[58vh] max-w-xl rounded-t-3xl p-4 pb-28"
            >
              <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-muted-foreground/30" />
              <Gallery images={sel.images} alt={sel.name} className="h-44 rounded-2xl" />
              <div className="mt-4 flex items-start justify-between gap-3 px-1">
                <div>
                  <p className="eyebrow text-muted-foreground">{sel.city} · {sel.day}</p>
                  <h2 className="mt-1 text-xl font-semibold tracking-tight">{sel.name}</h2>
                  <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground"><Star className="h-3.5 w-3.5 fill-honey text-honey" />{sel.rating} · {sel.stallsLeft} stalls left</p>
                </div>
                <Link to="/listing/$id" params={{ id: sel.id }} className="tap flex shrink-0 items-center gap-1.5 rounded-full bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground">
                  ${sel.price} <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </main>
  );
}
