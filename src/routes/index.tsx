import { createFileRoute, Link } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { Search, X, MapPin, ArrowUpRight } from "lucide-react";
import { useState } from "react";
import { markets, rails } from "@/lib/markets";
import heroImage from "@/assets/hero-night-market.jpg";
import { MarketCard } from "@/components/MarketCard";
import { Page } from "@/components/PageTransition";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Vendibook — Where are you selling this weekend?" },
      { name: "description", content: "Discover and book vendor stalls at night markets and farmer's markets near you." },
      { property: "og:title", content: "Vendibook — Where are you selling this weekend?" },
      { property: "og:description", content: "Discover and book vendor stalls at night markets and farmer's markets." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

function Home() {
  const [open, setOpen] = useState(false);
  return (
    <Page className="pb-32">
      <section className="relative h-[68vh] min-h-[480px] overflow-hidden">
        <motion.img
          src={heroImage}
          alt="A bustling night market under string lights"
          initial={{ scale: 1.15 }}
          animate={{ scale: 1 }}
          transition={{ duration: 2.4, ease: [0.2, 0.8, 0.2, 1] }}
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="bg-hero-scrim absolute inset-0" />
        <div className="relative mx-auto flex h-full max-w-6xl flex-col justify-between px-5 pb-16 pt-[max(1.25rem,env(safe-area-inset-top))]">
          <div className="flex items-center justify-between text-on-scrim">
            <span className="text-[17px] font-semibold tracking-tight">vendibook</span>
            <span className="glass flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-foreground">
              <MapPin className="h-3.5 w-3.5" /> Phoenix
            </span>
          </div>
          <div>
            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, type: "spring", stiffness: 120, damping: 20 }}
              className="display max-w-3xl text-[13vw] text-on-scrim sm:text-7xl md:text-8xl"
            >
              Where are you selling this weekend?
            </motion.h1>
            <motion.button
              layoutId="search"
              onClick={() => setOpen(true)}
              className="tap glass shadow-float mt-7 flex w-full max-w-md items-center gap-3 rounded-full px-5 py-4 text-left"
            >
              <Search className="h-5 w-5" />
              <span className="text-[15px] text-muted-foreground">Search cities or markets…</span>
            </motion.button>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl space-y-10 pt-6">
        {rails.map((r, i) => (
          <section key={r.title}>
            <div className="flex items-end justify-between px-5">
              <div>
                <p className="eyebrow text-muted-foreground">{["Hot this week", "Fresh & local", "Curated"][i]}</p>
                <h2 className="mt-1 text-2xl font-semibold tracking-tight">{r.title}</h2>
              </div>
              <Link to="/map" className="tap rounded-full bg-secondary p-2.5" aria-label="See on map">
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="no-scrollbar mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-5 px-5 pb-2">
              {r.items.map((m) => (
                <MarketCard key={m.id} m={m} wide={i === 0} />
              ))}
            </div>
          </section>
        ))}
      </div>

      <AnimatePresence>{open && <SearchModal onClose={() => setOpen(false)} />}</AnimatePresence>
    </Page>
  );
}

function SearchModal({ onClose }: { onClose: () => void }) {
  const [q, setQ] = useState("");
  const results = markets.filter((m) => `${m.name} ${m.city}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="glass fixed inset-0 z-50 overflow-y-auto"
    >
      <div className="mx-auto max-w-xl px-5 pt-[max(1.25rem,env(safe-area-inset-top))]">
        <div className="flex items-center gap-3">
          <motion.div layoutId="search" className="flex flex-1 items-center gap-3 rounded-full bg-card px-5 py-4 shadow-soft">
            <Search className="h-5 w-5" />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search cities or markets…"
              className="flex-1 bg-transparent text-[15px] outline-none placeholder:text-muted-foreground"
            />
          </motion.div>
          <button onClick={onClose} className="tap rounded-full bg-card p-3.5 shadow-soft" aria-label="Close search">
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="eyebrow mt-8 text-muted-foreground">{q ? `${results.length} results` : "Popular near you"}</p>
        <ul className="mt-3 space-y-2 pb-10">
          {results.map((m, i) => (
            <motion.li key={m.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
              <Link to="/listing/$id" params={{ id: m.id }} className="tap flex items-center gap-4 rounded-2xl bg-card p-2.5 shadow-soft">
                <img src={m.images[0]} alt="" className="h-14 w-14 rounded-xl object-cover" />
                <div className="flex-1">
                  <p className="font-semibold tracking-tight">{m.name}</p>
                  <p className="text-sm text-muted-foreground">{m.city} · {m.day}</p>
                </div>
                <span className="pr-2 text-sm font-semibold">${m.price}</span>
              </Link>
            </motion.li>
          ))}
        </ul>
      </div>
    </motion.div>
  );
}
