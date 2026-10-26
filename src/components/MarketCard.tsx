import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Star } from "lucide-react";
import type { Market } from "@/lib/markets";

export function MarketCard({ m, wide = false }: { m: Market; wide?: boolean }) {
  return (
    <Link
      to="/listing/$id"
      params={{ id: m.id }}
      className={`tap group relative block shrink-0 snap-start overflow-hidden rounded-3xl bg-muted shadow-soft ${
        wide ? "aspect-[4/5] w-[78vw] max-w-[340px]" : "aspect-[3/4] w-[62vw] max-w-[260px]"
      }`}
    >
      <motion.img
        layoutId={`img-${m.id}`}
        src={m.images[0]}
        alt={m.name}
        loading="lazy"
        className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
      />
      <div className="bg-card-scrim absolute inset-0" />
      <div className="glass absolute left-3 top-3 flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold">
        <Star className="h-3 w-3 fill-honey text-honey" /> {m.rating}
      </div>
      <div className="absolute inset-x-0 bottom-0 p-4 text-on-scrim">
        <p className="eyebrow opacity-70">{m.city} · {m.day}</p>
        <h3 className="mt-1 text-lg font-semibold leading-tight tracking-tight">{m.name}</h3>
        <p className="mt-2 text-sm">
          <span className="font-semibold text-honey">${m.price}</span>
          <span className="opacity-70"> / stall · {m.stallsLeft} left</span>
        </p>
      </div>
    </Link>
  );
}
