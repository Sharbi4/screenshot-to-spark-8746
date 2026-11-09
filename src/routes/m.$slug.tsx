import { createFileRoute, Link, notFound, useRouter } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ChevronLeft, Share, Clock, CalendarDays, Globe, ArrowUpRight, Ruler } from "lucide-react";
import { getMarketProfile } from "@/lib/directory.functions";
import { BRAND } from "@/lib/brand";
import { Gallery } from "@/components/Gallery";
import { Amenities } from "@/components/Amenities";
import { LocationCard } from "@/components/LocationCard";
import { VendorDirectory, VendorLogo } from "@/components/VendorDirectory";
import { ShareButton } from "@/components/ShareButton";
import { ManageMarketInvite } from "@/components/ManageMarketInvite";
import { ScheduleCard, ContactLinks, VendorInfo, SourcesNote, PlaceLinks } from "@/components/DirectorySections";
import { getMapConfig } from "@/lib/map.functions";

export const Route = createFileRoute("/m/$slug")({
  loader: async ({ params }) => {
    const [profile, config] = await Promise.all([getMarketProfile({ data: { slug: params.slug } }), getMapConfig().catch(() => ({ token: "" }))]);
    if (!profile) throw notFound();
    return { ...profile, mapToken: config.token };
  },
  head: ({ loaderData: m }) => {
    if (!m) return { meta: [{ title: `Market not found — ${BRAND}` }, { name: "robots", content: "noindex" }] };
    const title = `${m.name} · ${m.city} — ${BRAND}`;
    const description = m.description.slice(0, 160) || `${m.kindLabel} in ${m.city}. Hours, vendors, and booth information.`;
    const meta = [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      ...(m.images[0] ? [{ property: "og:image", content: m.images[0] }, { name: "twitter:image", content: m.images[0] }] : []),
      // Example listings are illustrative and should not be indexed.
      ...(m.source === "example" ? [{ name: "robots", content: "noindex" }] : []),
    ];
    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "LocalBusiness",
      name: m.name,
      description: m.description,
      address: { "@type": "PostalAddress", streetAddress: m.address || undefined, addressLocality: m.city },
      image: m.images[0],
      url: m.websiteUrl ?? undefined,
    };
    return { meta, scripts: m.source === "directory" ? [{ type: "application/ld+json", children: JSON.stringify(jsonLd) }] : [] };
  },
  component: MarketProfilePage,
});

function MarketProfilePage() {
  const m = Route.useLoaderData();
  const router = useRouter();
  const d = m.directory;
  const featured = m.vendors.filter((a) => a.featured && a.vendor.products.length).slice(0, 6);

  return (
    <main className="pb-36">
      <div className="relative mx-auto max-w-5xl md:px-5 md:pt-5">
        <div className="overflow-hidden md:rounded-3xl">
          {m.images.length ? (
            <Gallery images={m.images} alt={m.name} className="h-[50vh] min-h-[340px]" />
          ) : (
            <div className="flex h-[42vh] min-h-[300px] items-end bg-scrim px-5 pb-12 md:px-9">
              <p className="display max-w-2xl text-5xl text-on-scrim/90 md:text-7xl" aria-hidden>{m.name}</p>
            </div>
          )}
        </div>
        <div className="absolute inset-x-0 top-0 flex justify-between p-4 pt-[max(1rem,env(safe-area-inset-top))] md:px-9 md:pt-9">
          <button onClick={() => router.history.back()} className="tap glass rounded-full p-2.5" aria-label="Back">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            {m.source === "example" && <span className="glass rounded-full px-3 py-1.5 text-xs font-semibold">Example listing</span>}
            <ShareButton title={m.name} className="tap glass rounded-full p-2.5"><Share className="h-5 w-5" /></ShareButton>
          </div>
        </div>
      </div>

      <motion.article
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, type: "spring", stiffness: 200, damping: 26 }}
        className="relative z-10 mx-auto -mt-6 max-w-3xl rounded-t-3xl bg-background px-5 pt-7 md:mt-0"
      >
        {d?.state ? <PlaceLinks state={d.state} city={m.city} /> : null}
        <p className={`eyebrow text-sage ${d?.state ? "mt-2" : ""}`}>{m.kindLabel} · {m.city}{d?.state ? `, ${d.state}` : ""}</p>
        <h1 className="display mt-2 text-4xl md:text-5xl">{m.name}</h1>
        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
          {m.schedule && <span className="flex items-center gap-1.5"><CalendarDays className="h-4 w-4" />{m.schedule}</span>}
          {m.hours && <span className="flex items-center gap-1.5"><Clock className="h-4 w-4" />{m.hours}</span>}
          {m.websiteUrl && (
            <a href={m.websiteUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 underline-offset-4 hover:underline">
              <Globe className="h-4 w-4" />Website
            </a>
          )}
        </div>
        {m.description && <p className="mt-6 text-[17px] leading-relaxed">{m.description}</p>}

        {m.categories.length > 0 && (
          <>
            <h2 className="eyebrow mt-9 text-muted-foreground">Vendor categories</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {m.categories.map((c) => <span key={c} className="rounded-full bg-secondary px-3.5 py-2 text-sm font-medium">{c}</span>)}
            </div>
          </>
        )}

        {m.amenities.length > 0 && (
          <>
            <h2 className="eyebrow mt-9 text-muted-foreground">Included</h2>
            <div className="mt-3"><Amenities items={m.amenities} /></div>
          </>
        )}

        {d && (
          <>
            <h2 className="eyebrow mt-9 text-muted-foreground">Hours &amp; season</h2>
            <div className="mt-3"><ScheduleCard d={d} /></div>
            <div className="mt-4"><ContactLinks d={d} websiteUrl={m.websiteUrl} /></div>
          </>
        )}

        <h2 className="eyebrow mt-9 text-muted-foreground">Location</h2>
        <div className="mt-3"><LocationCard name={d?.venueName ? `${m.name} · ${d.venueName}` : m.name} address={m.address} city={d?.state ? `${m.city}, ${d.state}${d.postalCode ? ` ${d.postalCode}` : ""}` : m.city} pin={m.pin} coords={d?.coords ?? null} mapToken={m.mapToken} mapSlug={m.slug} /></div>

        {featured.length > 0 && (
          <section className="mt-10">
            <p className="eyebrow text-muted-foreground">This week</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight">Featured vendors</h2>
            <div className="no-scrollbar -mx-5 mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-5 px-5 pb-2">
              {featured.map((a) => (
                <Link key={a.vendor.slug} to="/v/$slug" params={{ slug: a.vendor.slug }} className="tap group relative block aspect-[3/4] w-[62vw] max-w-[240px] shrink-0 snap-start overflow-hidden rounded-3xl bg-muted shadow-soft">
                  <img src={a.vendor.products[0]} alt={`${a.vendor.name} product`} loading="lazy" className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
                  <div className="bg-card-scrim absolute inset-0" />
                  <div className="absolute inset-x-0 bottom-0 flex items-center gap-2.5 p-4 text-on-scrim">
                    <VendorLogo name={a.vendor.name} logo={a.vendor.logo} className="h-9 w-9" />
                    <p className="text-[15px] font-semibold leading-tight tracking-tight">{a.vendor.name}</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        <section className="mt-10">
          <p className="eyebrow text-muted-foreground">Who's selling</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight">Vendor directory</h2>
          <div className="mt-4"><VendorDirectory appearances={m.vendors} /></div>
        </section>

        <section className="mt-10">
          <p className="eyebrow text-muted-foreground">For vendors</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight">Booking information</h2>
          {d && m.boothTypes.length === 0 ? (
            <div className="mt-4"><VendorInfo d={d} claimed={m.claimed} /></div>
          ) : m.boothTypes.length > 0 ? (
            <ul className="mt-4 grid gap-2 sm:grid-cols-2">
              {m.boothTypes.map((b) => (
                <li key={b.id}>
                  <Link to="/stalls/$id" params={{ id: b.id }} className="tap flex items-center justify-between gap-3 rounded-2xl bg-card p-4 shadow-soft">
                    <span className="min-w-0">
                      <span className="block truncate font-semibold tracking-tight">{b.label}</span>
                      <span className="mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground"><Ruler className="h-3.5 w-3.5" />{b.size}{!b.available && " · Unavailable"}</span>
                    </span>
                    <span className="shrink-0 text-sm font-semibold">${b.price}<span className="font-normal text-muted-foreground"> / day</span></span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : m.exampleListing ? (
            <Link to="/listing/$id" params={{ id: m.exampleListing.id }} className="tap mt-4 flex items-center justify-between rounded-2xl bg-card p-4 shadow-soft">
              <span className="font-semibold tracking-tight">Stalls from ${m.exampleListing.price} / day</span>
              <span className="flex items-center gap-1 text-sm font-semibold">See stalls <ArrowUpRight className="h-4 w-4" /></span>
            </Link>
          ) : (
            <p className="mt-3 text-[15px] text-muted-foreground">
              {m.claimed ? "Booth types and booking dates will be published by the organizer soon." : "Online booking opens once the market's organizer joins."}
            </p>
          )}
        </section>

        {m.nearby.length > 0 && (
          <section className="mt-10">
            <p className="eyebrow text-muted-foreground">Keep exploring</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight">Related markets nearby</h2>
            <ul className="mt-4 space-y-2">
              {m.nearby.map((n) => (
                <li key={n.slug}>
                  <Link to="/m/$slug" params={{ slug: n.slug }} className="tap flex items-center gap-4 rounded-2xl bg-card p-2.5 shadow-soft">
                    {n.image ? <img src={n.image} alt="" loading="lazy" className="h-14 w-14 rounded-xl object-cover" /> : <span className="h-14 w-14 rounded-xl bg-secondary" aria-hidden />}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold tracking-tight">{n.name}</span>
                      <span className="block truncate text-sm text-muted-foreground">{[n.city, n.schedule].filter(Boolean).join(" · ")}</span>
                    </span>
                    <ArrowUpRight className="mr-2 h-4 w-4 text-muted-foreground" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {!m.claimed && <div className="mt-12"><ManageMarketInvite slug={m.slug} /></div>}

        {d && (d.sources.length > 0 || d.lastVerified) ? (
          <div className="mt-10"><SourcesNote d={d} organizer={d.organizerName} /></div>
        ) : m.provenance && (
          <p className="mt-10 text-xs text-muted-foreground">
            Listing information from{" "}
            {m.provenance.url ? <a href={m.provenance.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">{m.provenance.name}</a> : m.provenance.name}
            {m.provenance.verifiedAt && `, verified ${new Date(m.provenance.verifiedAt).toLocaleDateString("en-US", { month: "short", year: "numeric" })}`}.
          </p>
        )}
        {m.source === "example" && (
          <p className="mt-10 text-xs text-muted-foreground">Example listing shown for preview. Details are illustrative.</p>
        )}
      </motion.article>
    </main>
  );
}
