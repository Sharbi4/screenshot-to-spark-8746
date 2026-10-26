import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ShieldCheck, TrendingUp, CalendarDays, Plus, ArrowUpRight } from "lucide-react";
import { bookings, getMarket } from "@/lib/markets";
import { Page } from "@/components/PageTransition";

export const Route = createFileRoute("/bookings")({
  head: () => ({
    meta: [
      { title: "Studio — Vendibook" },
      { name: "description", content: "Your upcoming markets, earnings, and permits in one place." },
      { property: "og:title", content: "Studio — Vendibook" },
      { property: "og:description", content: "Your upcoming markets, earnings, and permits in one place." },
    ],
  }),
  component: Studio,
});

const bars = [38, 52, 44, 70, 58, 86, 74, 92];

const tile = (i: number) => ({
  initial: { opacity: 0, y: 16, scale: 0.97 },
  animate: { opacity: 1, y: 0, scale: 1 },
  transition: { delay: i * 0.06, type: "spring" as const, stiffness: 260, damping: 26 },
  whileTap: { scale: 0.98 },
});

function Studio() {
  const first = bookings[0]!;
  const next = getMarket(first.marketId)!;
  return (
    <Page className="mx-auto max-w-5xl px-5 pb-32 pt-[max(1.5rem,env(safe-area-inset-top))]">
      <p className="eyebrow text-muted-foreground">Studio · Maya's Mochi Co.</p>
      <h1 className="display mt-2 text-5xl md:text-6xl">Good evening, Maya.</h1>

      <div className="mt-8 grid auto-rows-[minmax(140px,auto)] grid-cols-2 gap-3 md:grid-cols-4">
        <motion.div {...tile(0)} className="relative col-span-2 row-span-2 overflow-hidden rounded-3xl shadow-soft">
          <Link to="/listing/$id" params={{ id: next.id }} className="block h-full min-h-[300px]">
            <img src={next.images[0]} alt={next.name} className="absolute inset-0 h-full w-full object-cover" />
            <div className="bg-card-scrim absolute inset-0" />
            <div className="glass absolute left-4 top-4 rounded-full px-3 py-1.5 text-xs font-semibold">Next up · {first.date}</div>
            <div className="absolute inset-x-0 bottom-0 p-5 text-on-scrim">
              <p className="eyebrow opacity-70">{first.stall}</p>
              <h2 className="mt-1 text-2xl font-semibold tracking-tight">{next.name}</h2>
              <p className="mt-1 text-sm opacity-80">{next.hours} · {next.city}</p>
            </div>
          </Link>
        </motion.div>

        <motion.div {...tile(1)} className="col-span-2 rounded-3xl bg-primary p-5 text-primary-foreground shadow-soft">
          <div className="flex items-center justify-between">
            <p className="eyebrow opacity-60">Earnings · October</p>
            <TrendingUp className="h-4 w-4 text-honey" />
          </div>
          <p className="display mt-3 text-5xl">$4,820</p>
          <p className="mt-1 text-sm opacity-60">+22% vs. September · $640 spent on stalls</p>
          <div className="mt-5 flex h-16 items-end gap-1.5">
            {bars.map((h, i) => (
              <motion.span key={i} initial={{ height: 0 }} animate={{ height: `${h}%` }} transition={{ delay: 0.3 + i * 0.05 }} className={`flex-1 rounded-md ${i === bars.length - 1 ? "bg-honey" : "bg-primary-foreground/20"}`} />
            ))}
          </div>
        </motion.div>

        <motion.div {...tile(2)} className="rounded-3xl bg-sage p-5 text-sage-foreground shadow-soft">
          <ShieldCheck className="h-5 w-5" />
          <p className="eyebrow mt-6 opacity-70">Permit status</p>
          <p className="mt-1 text-lg font-semibold tracking-tight">Maricopa food permit</p>
          <p className="mt-1 text-sm opacity-80">Valid · renews Mar 2027</p>
        </motion.div>

        <motion.div {...tile(3)} className="rounded-3xl bg-card p-5 shadow-soft">
          <CalendarDays className="h-5 w-5 text-muted-foreground" />
          <p className="display mt-6 text-4xl">12</p>
          <p className="mt-1 text-sm text-muted-foreground">Markets this season</p>
        </motion.div>
      </div>

      <div className="mt-10 flex items-end justify-between">
        <h2 className="text-2xl font-semibold tracking-tight">Upcoming</h2>
        <Link to="/" className="tap flex items-center gap-1 rounded-full bg-secondary px-3.5 py-2 text-sm font-medium"><Plus className="h-4 w-4" />Book</Link>
      </div>
      <ul className="mt-4 space-y-2">
        {bookings.map((b, i) => {
          const m = getMarket(b.marketId)!;
          return (
            <motion.li key={b.marketId} {...tile(i + 4)}>
              <Link to="/listing/$id" params={{ id: m.id }} className="flex items-center gap-4 rounded-3xl bg-card p-3 shadow-soft">
                <img src={m.images[0]} alt="" className="h-16 w-16 rounded-2xl object-cover" />
                <div className="flex-1">
                  <p className="font-semibold tracking-tight">{m.name}</p>
                  <p className="text-sm text-muted-foreground">{b.date} · {b.stall}</p>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${b.status === "Confirmed" ? "bg-sage/15 text-sage" : "bg-honey/20 text-honey-foreground"}`}>{b.status}</span>
                <ArrowUpRight className="mr-1 h-4 w-4 text-muted-foreground" />
              </Link>
            </motion.li>
          );
        })}
      </ul>
    </Page>
  );
}
