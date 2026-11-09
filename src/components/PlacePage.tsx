import { Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import { Page } from "@/components/PageTransition";
import type { PlaceDirectory } from "@/lib/directory.server";

/** City/state discovery page in the existing list-card language. */
export function PlacePage({ place }: { place: PlaceDirectory }) {
  const title = place.city ? `${place.city}, ${place.state}` : place.state;
  return (
    <Page className="mx-auto max-w-3xl px-5 pb-32 pt-[max(2rem,env(safe-area-inset-top))]">
      <p className="eyebrow text-sage">
        <Link to="/markets" className="hover:text-foreground">Markets</Link>
        {place.city && <> · <Link to="/markets/$state" params={{ state: place.state.toLowerCase() }} className="hover:text-foreground">{place.state}</Link></>}
      </p>
      <h1 className="display mt-3 text-5xl md:text-6xl">Markets in {title}</h1>
      <p className="mt-4 text-[17px] text-muted-foreground">{place.markets.length} {place.markets.length === 1 ? "market" : "markets"} with verified schedules and locations.</p>
      <ul className="mt-8 space-y-2">
        {place.markets.map((m) => (
          <li key={m.slug}>
            <Link to="/m/$slug" params={{ slug: m.slug }} className="tap flex items-center gap-4 rounded-2xl bg-card p-2.5 shadow-soft">
              {m.image ? <img src={m.image} alt="" loading="lazy" className="h-14 w-14 rounded-xl object-cover" /> : <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-scrim text-lg font-semibold text-on-scrim/80" aria-hidden>{m.name.slice(0, 1)}</span>}
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold tracking-tight">{m.name}</span>
                <span className="block truncate text-sm text-muted-foreground">{[m.kindLabel, !place.city && m.city, m.season].filter(Boolean).join(" · ")}</span>
              </span>
              <ArrowUpRight className="mr-2 h-4 w-4 text-muted-foreground" />
            </Link>
          </li>
        ))}
      </ul>
      {!place.city && place.cities.length > 1 && (
        <section className="mt-10">
          <h2 className="eyebrow text-muted-foreground">Cities</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {place.cities.map((c) => (
              <Link key={c.slug} to="/markets/$state/$city" params={{ state: place.state.toLowerCase(), city: c.slug }} className="tap rounded-full bg-secondary px-3.5 py-2 text-sm font-medium">{c.city} <span className="text-muted-foreground">{c.count}</span></Link>
            ))}
          </div>
        </section>
      )}
    </Page>
  );
}
