import { createFileRoute, Link, notFound, useRouter } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ChevronLeft, Heart, Share, Star, Clock, Users, ArrowUpRight } from "lucide-react";
import { useState } from "react";
import { getMarket } from "@/lib/markets";
import { Gallery } from "@/components/Gallery";
import { Amenities } from "@/components/Amenities";
import { BookingRequest } from "@/components/BookingRequest";

export const Route = createFileRoute("/listing/$id")({
  loader: ({ params }) => {
    const m = getMarket(params.id);
    if (!m) throw notFound();
    return m;
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.name} — Vendibook` },
          { name: "description", content: loaderData.description },
          { property: "og:title", content: `${loaderData.name} — Vendibook` },
          { property: "og:description", content: loaderData.description },
          { property: "og:type", content: "website" },
          { name: "twitter:card", content: "summary_large_image" },
          { property: "og:image", content: loaderData.images[0] },
          { name: "twitter:image", content: loaderData.images[0] },
        ]
      : [{ title: "Market not found — Vendibook" }, { name: "robots", content: "noindex" }],
  }),
  component: Listing,
});

function Listing() {
  const m = Route.useLoaderData();
  const router = useRouter();
  const [saved, setSaved] = useState(false);

  return (
    <main className="pb-36">
      <div className="relative mx-auto max-w-5xl md:px-5 md:pt-5">
        <motion.div layoutId={`img-${m.id}`} className="overflow-hidden md:rounded-3xl">
          <Gallery images={m.images} alt={m.name} className="h-[50vh] min-h-[340px]" />
        </motion.div>
        <div className="absolute inset-x-0 top-0 flex justify-between p-4 pt-[max(1rem,env(safe-area-inset-top))] md:px-9 md:pt-9">
          <button onClick={() => router.history.back()} className="tap glass rounded-full p-2.5" aria-label="Back">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="flex gap-2">
            <button className="tap glass rounded-full p-2.5" aria-label="Share"><Share className="h-5 w-5" /></button>
            <button onClick={() => setSaved(!saved)} className="tap glass rounded-full p-2.5" aria-label="Save">
              <Heart className={`h-5 w-5 ${saved ? "fill-honey text-honey" : ""}`} />
            </button>
          </div>
        </div>
      </div>

      <motion.article
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, type: "spring", stiffness: 200, damping: 26 }}
        className="relative z-10 mx-auto -mt-6 max-w-3xl rounded-t-3xl bg-background px-5 pt-7 md:mt-0"
      >
        <p className="eyebrow text-sage">{m.kind === "night" ? "Night market" : m.kind === "farmers" ? "Farmer's market" : "Makers fair"} · {m.city}</p>
        <h1 className="display mt-2 text-4xl md:text-5xl">{m.name}</h1>
        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5"><Star className="h-4 w-4 fill-honey text-honey" /><b className="text-foreground">{m.rating}</b> ({m.reviews})</span>
          <span className="flex items-center gap-1.5"><Clock className="h-4 w-4" />{m.day}, {m.hours}</span>
          <span className="flex items-center gap-1.5"><Users className="h-4 w-4" />{m.footfall} weekly visitors</span>
        </div>
        <p className="mt-6 text-[17px] leading-relaxed">{m.description}</p>
        <Link to="/m/$slug" params={{ slug: m.id }} className="mt-4 inline-flex items-center gap-1 text-sm font-semibold underline-offset-4 hover:underline">
          Market profile, vendors & location <ArrowUpRight className="h-4 w-4" />
        </Link>
        <h2 className="eyebrow mt-9 text-muted-foreground">Included</h2>
        <div className="mt-3"><Amenities items={m.amenities} /></div>
        <div className="mt-9 grid grid-cols-3 gap-2 text-center">
          {[["10×10", "Stall size"], [String(m.stallsLeft), "Stalls left"], ["48h", "Free cancel"]].map(([v, l]) => (
            <div key={l} className="rounded-2xl bg-card p-4 shadow-soft">
              <p className="text-xl font-semibold tracking-tight">{v}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{l}</p>
            </div>
          ))}
        </div>
      </motion.article>

      <div className="fixed inset-x-0 bottom-0 z-40 px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="glass shadow-float mx-auto flex max-w-xl items-center justify-between rounded-full py-2 pl-6 pr-2">
          <div>
            <p className="text-lg font-semibold leading-none tracking-tight">${m.price}<span className="text-sm font-normal text-muted-foreground"> / day</span></p>
            <p className="mt-1 text-xs text-muted-foreground">Next: {m.day}</p>
          </div>
          <BookingRequest marketId={m.id} name={m.name} />
        </div>
      </div>
    </main>
  );
}
