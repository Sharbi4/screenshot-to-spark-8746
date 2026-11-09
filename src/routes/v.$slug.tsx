import { createFileRoute, Link, notFound, useRouter } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ChevronLeft, Share, MapPin, Globe, AtSign, Mail, ArrowUpRight, CalendarDays } from "lucide-react";
import { getVendorProfile } from "@/lib/directory.functions";
import type { VendorMarketDate } from "@/lib/directory.server";
import { BRAND } from "@/lib/brand";
import { ShareButton } from "@/components/ShareButton";
import { VendorLogo, formatDay } from "@/components/VendorDirectory";

export const Route = createFileRoute("/v/$slug")({
  loader: async ({ params }) => {
    const vendor = await getVendorProfile({ data: { slug: params.slug } });
    if (!vendor) throw notFound();
    return vendor;
  },
  head: ({ loaderData: v }) => {
    if (!v) return { meta: [{ title: `Vendor not found — ${BRAND}` }, { name: "robots", content: "noindex" }] };
    const title = `${v.name} — ${BRAND}`;
    const description = (v.tagline || v.description).slice(0, 160) || `${v.name}: upcoming markets and products.`;
    const image = v.cover ?? v.products[0] ?? v.logo;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "profile" },
        { name: "twitter:card", content: "summary_large_image" },
        ...(image ? [{ property: "og:image", content: image }, { name: "twitter:image", content: image }] : []),
      ],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "LocalBusiness",
            name: v.name,
            description: v.description || undefined,
            image: image ?? undefined,
            url: v.websiteUrl ?? undefined,
            areaServed: v.serviceArea || undefined,
          }),
        },
      ],
    };
  },
  component: VendorProfilePage,
});

function DateRow({ d }: { d: VendorMarketDate }) {
  return (
    <li>
      <Link to="/m/$slug" params={{ slug: d.market.slug }} className="tap flex items-center gap-4 rounded-2xl bg-card p-2.5 shadow-soft">
        <span className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-secondary">
          <span className="eyebrow text-[10px] text-muted-foreground">{formatDay(d.date).split(",")[0]}</span>
          <span className="text-lg font-semibold leading-none tracking-tight">{new Date(`${d.date}T12:00:00Z`).getUTCDate()}</span>
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold tracking-tight">{d.market.name}</span>
          <span className="block truncate text-sm text-muted-foreground">
            {[formatDay(d.date), d.market.city, d.booth && `Booth ${d.booth}`].filter(Boolean).join(" · ")}
          </span>
        </span>
        <ArrowUpRight className="mr-2 h-4 w-4 text-muted-foreground" />
      </Link>
    </li>
  );
}

function VendorProfilePage() {
  const v = Route.useLoaderData();
  const router = useRouter();
  const contacts = [
    v.websiteUrl && { href: v.websiteUrl, label: "Website", icon: Globe },
    v.instagram && { href: `https://instagram.com/${v.instagram}`, label: `@${v.instagram}`, icon: AtSign },
    v.email && { href: `mailto:${v.email}`, label: "Email", icon: Mail },
  ].filter(Boolean) as { href: string; label: string; icon: typeof Globe }[];

  return (
    <main className="pb-32">
      <div className="relative mx-auto max-w-5xl md:px-5 md:pt-5">
        <div className="h-[38vh] min-h-[260px] overflow-hidden bg-scrim md:rounded-3xl">
          {(v.cover ?? v.products[0]) && <img src={v.cover ?? v.products[0]} alt="" className="h-full w-full object-cover" />}
        </div>
        <div className="absolute inset-x-0 top-0 flex justify-between p-4 pt-[max(1rem,env(safe-area-inset-top))] md:px-9 md:pt-9">
          <button onClick={() => router.history.back()} className="tap glass rounded-full p-2.5" aria-label="Back">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <ShareButton title={v.name} className="tap glass rounded-full p-2.5"><Share className="h-5 w-5" /></ShareButton>
        </div>
      </div>

      <motion.article
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, type: "spring", stiffness: 200, damping: 26 }}
        className="relative z-10 mx-auto -mt-6 max-w-3xl rounded-t-3xl bg-background px-5 pt-7 md:mt-0"
      >
        <div className="-mt-16 mb-4">
          <VendorLogo name={v.name} logo={v.logo} className="h-24 w-24 border-4 border-background shadow-float" />
        </div>
        {(v.category || v.serviceArea) && <p className="eyebrow text-sage">{[v.category, v.serviceArea].filter(Boolean).join(" · ")}</p>}
        <h1 className="display mt-2 text-4xl md:text-5xl">{v.name}</h1>
        {v.tagline && <p className="mt-3 text-lg text-muted-foreground">{v.tagline}</p>}
        {v.description && <p className="mt-6 whitespace-pre-line text-[17px] leading-relaxed">{v.description}</p>}

        {contacts.length > 0 && (
          <div className="mt-6 flex flex-wrap gap-2">
            {contacts.map(({ href, label, icon: Icon }) => (
              <a key={href} href={href} target={href.startsWith("mailto:") ? undefined : "_blank"} rel="noopener noreferrer" className="tap flex items-center gap-2 rounded-full bg-secondary px-4 py-2.5 text-sm font-medium">
                <Icon className="h-4 w-4 text-sage" />{label}
              </a>
            ))}
          </div>
        )}

        {v.products.length > 0 && (
          <section className="mt-10">
            <p className="eyebrow text-muted-foreground">The goods</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight">Featured products</h2>
            <div className="no-scrollbar -mx-5 mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-5 px-5 pb-2">
              {v.products.map((src, i) => (
                <img key={src} src={src} alt={`${v.name} product ${i + 1}`} loading="lazy" className="aspect-[3/4] w-[62vw] max-w-[240px] shrink-0 snap-start rounded-3xl bg-muted object-cover shadow-soft" />
              ))}
            </div>
          </section>
        )}

        <section className="mt-10">
          <p className="eyebrow text-muted-foreground">Find us</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight">Upcoming markets</h2>
          {v.upcoming.length ? (
            <ul className="mt-4 space-y-2">{v.upcoming.map((d) => <DateRow key={`${d.date}-${d.market.slug}`} d={d} />)}</ul>
          ) : (
            <div className="mt-4 flex items-center gap-4 rounded-3xl bg-card p-5 shadow-soft">
              <CalendarDays className="h-6 w-6 shrink-0 text-sage" />
              <p className="text-sm text-muted-foreground">No upcoming markets confirmed yet.</p>
            </div>
          )}
        </section>

        {v.past.length > 0 && (
          <section className="mt-10">
            <h2 className="eyebrow text-muted-foreground">Past markets</h2>
            <ul className="mt-3 space-y-2">{v.past.map((d) => <DateRow key={`${d.date}-${d.market.slug}`} d={d} />)}</ul>
          </section>
        )}

        {v.serviceArea && (
          <p className="mt-10 flex items-center gap-1.5 text-sm text-muted-foreground"><MapPin className="h-4 w-4" />Serves {v.serviceArea}</p>
        )}
      </motion.article>
    </main>
  );
}
