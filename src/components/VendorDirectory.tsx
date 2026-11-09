import { Link } from "@tanstack/react-router";
import { Store } from "lucide-react";
import type { VendorAppearance } from "@/lib/directory.server";

export const formatDay = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });

export function VendorLogo({ name, logo, className = "h-14 w-14" }: { name: string; logo: string | null; className?: string }) {
  return logo ? (
    <img src={logo} alt="" loading="lazy" className={`${className} shrink-0 rounded-2xl bg-secondary object-cover`} />
  ) : (
    <span aria-hidden className={`${className} flex shrink-0 items-center justify-center rounded-2xl bg-secondary text-lg font-semibold text-sage`}>
      {name.slice(0, 1).toUpperCase()}
    </span>
  );
}

/** Vendors with confirmed participation, grouped by upcoming market date. */
export function VendorDirectory({ appearances }: { appearances: VendorAppearance[] }) {
  if (!appearances.length) {
    return (
      <div className="flex items-center gap-4 rounded-3xl bg-card p-5 shadow-soft">
        <Store className="h-6 w-6 shrink-0 text-sage" />
        <p className="text-sm text-muted-foreground">Confirmed vendors appear here as the organizer confirms them for upcoming dates.</p>
      </div>
    );
  }
  const byDate = appearances.reduce<Record<string, VendorAppearance[]>>((acc, a) => ((acc[a.date] ??= []).push(a), acc), {});
  return (
    <div className="space-y-6">
      {Object.entries(byDate)
        .slice(0, 6)
        .map(([date, list]) => (
          <div key={date}>
            <p className="eyebrow text-muted-foreground">
              {formatDay(date)} · {list.length} {list.length === 1 ? "vendor" : "vendors"}
            </p>
            <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {list.map((a) => (
                <li key={`${date}-${a.vendor.slug}`}>
                  <Link to="/v/$slug" params={{ slug: a.vendor.slug }} className="tap flex items-center gap-3 rounded-2xl bg-card p-2.5 shadow-soft">
                    <VendorLogo name={a.vendor.name} logo={a.vendor.logo} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold tracking-tight">{a.vendor.name}</p>
                      <p className="truncate text-sm text-muted-foreground">
                        {[a.vendor.category, a.booth && `Booth ${a.booth}`].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
    </div>
  );
}
