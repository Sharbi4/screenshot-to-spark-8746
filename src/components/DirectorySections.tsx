import { Link } from "@tanstack/react-router";
import { ArrowUpRight, CalendarDays, Clock, Globe, Mail, Phone, AtSign, ClipboardList, BadgeCheck } from "lucide-react";
import type { DirectoryDetails } from "@/lib/directory.server";
import { formatDate, formatRule } from "@/lib/schedule-format";

/** Hours & season, exactly as published by the organizer. */
export function ScheduleCard({ d }: { d: DirectoryDetails }) {
  const rules = d.scheduleRules.map(formatRule);
  return (
    <div className="overflow-hidden rounded-3xl bg-card shadow-soft">
      {rules.length ? (
        <ul>
          {rules.map((r, i) => (
            <li key={i} className={`flex items-start gap-4 px-5 py-4 ${i ? "border-t" : ""}`}>
              <Clock className="mt-0.5 h-5 w-5 shrink-0 text-sage" />
              <span className="min-w-0 flex-1">
                <span className="block font-medium">{r.days}{rules.some((x) => x.label !== r.label) && <span className="text-muted-foreground"> · {r.label}</span>}</span>
                <span className="block text-sm text-muted-foreground">{r.hours}{r.range && ` · ${r.range}`}</span>
                {r.note && <span className="mt-1 block text-xs text-muted-foreground">{r.note}</span>}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="px-5 py-4 text-sm text-muted-foreground">Hours haven't been verified yet. Check the official website before visiting.</p>
      )}
      {(d.seasonNote || d.upcomingDates.length > 0) && (
        <div className="border-t px-5 py-4">
          {d.seasonNote && <p className="text-sm">{d.seasonNote}</p>}
          {d.upcomingDates.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {d.upcomingDates.map((date) => (
                <span key={date} className="flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold"><CalendarDays className="h-3.5 w-3.5 text-sage" />{formatDate(date)}</span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** Official links and public contact details. */
export function ContactLinks({ d, websiteUrl }: { d: DirectoryDetails; websiteUrl: string | null }) {
  const links = [
    websiteUrl && { href: websiteUrl, label: "Official website", icon: Globe },
    d.contactPhone && { href: `tel:${d.contactPhone.replace(/[^\d+]/g, "")}`, label: d.contactPhone, icon: Phone },
    d.contactEmail && { href: `mailto:${d.contactEmail}`, label: "Email", icon: Mail },
    ...Object.entries(d.socials).map(([k, href]) => ({ href, label: k[0]!.toUpperCase() + k.slice(1), icon: AtSign })),
  ].filter(Boolean) as { href: string; label: string; icon: typeof Globe }[];
  if (!links.length) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {links.map(({ href, label, icon: Icon }) => (
        <a key={href} href={href} target={href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer" className="tap flex items-center gap-2 rounded-full bg-secondary px-4 py-2.5 text-sm font-medium">
          <Icon className="h-4 w-4 text-sage" />{label}
        </a>
      ))}
    </div>
  );
}

/** Vendor opportunity facts. Never shows fabricated prices or availability. */
export function VendorInfo({ d, claimed }: { d: DirectoryDetails; claimed: boolean }) {
  return (
    <div className="space-y-3">
      <div className="rounded-3xl bg-card p-5 shadow-soft">
        <div className="flex items-start gap-4">
          <ClipboardList className="mt-0.5 h-5 w-5 shrink-0 text-sage" />
          <div className="min-w-0 flex-1">
            <p className="font-medium">
              {d.vendorApplications === "open" ? "Accepting vendor applications" : d.vendorApplications === "closed" ? "Vendor applications closed" : "Vendor applications"}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {d.vendorApplicationUrl ? "Applications are handled on the organizer's website." : "Contact the organizer for vendor opportunities."}
            </p>
            {d.vendorApplicationUrl && (
              <a href={d.vendorApplicationUrl} target="_blank" rel="noopener noreferrer" className="tap mt-3 inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground">
                Vendor information <ArrowUpRight className="h-4 w-4" />
              </a>
            )}
          </div>
        </div>
        {d.vendorTypes.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">{d.vendorTypes.map((t) => <span key={t} className="rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold">{t}</span>)}</div>
        )}
        {d.vendorRequirements && <p className="mt-4 border-t pt-4 text-sm text-muted-foreground">{d.vendorRequirements}</p>}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-2xl bg-card p-4 shadow-soft">
          <p className="text-sm font-semibold tracking-tight">{d.boothPriceNote || "Not published"}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">Booth pricing</p>
        </div>
        <div className="rounded-2xl bg-card p-4 shadow-soft">
          <p className="text-sm font-semibold tracking-tight">{d.bookingEnabled ? "Available" : "Not yet"}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">Book on MarketBloom</p>
        </div>
      </div>
      {!d.bookingEnabled && (
        <p className="px-1 text-xs text-muted-foreground">
          {claimed ? "The organizer manages this page. Online booking opens once they activate it." : "This is an informational listing. MarketBloom bookings open only after a verified organizer activates them."}
        </p>
      )}
    </div>
  );
}

/** Where the facts came from and when they were last checked. */
export function SourcesNote({ d, organizer }: { d: DirectoryDetails; organizer: string }) {
  if (!d.sources.length && !d.lastVerified) return null;
  return (
    <div className="flex items-start gap-3 text-xs text-muted-foreground">
      <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-sage" />
      <p>
        {d.lastVerified ? `Details verified ${formatDate(d.lastVerified, true)}` : "Details"} from{" "}
        {d.sources.length
          ? d.sources.map((s, i) => (
              <span key={s.url}>{i > 0 && ", "}<a href={s.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">{s.type === "official_website" ? "the official website" : new URL(s.url).hostname}</a></span>
            ))
          : "public sources"}
        {organizer && <> · Operated by {organizer}</>}
        {d.photo?.attribution && <> · Photo: {d.photo.attribution}</>}. Schedules can change. Confirm with the organizer before visiting.
      </p>
    </div>
  );
}

export function PlaceLinks({ state, city }: { state: string; city: string }) {
  if (!state) return null;
  return (
    <p className="eyebrow text-muted-foreground">
      <Link to="/markets/$state" params={{ state: state.toLowerCase() }} className="hover:text-foreground">{state}</Link>
      {" · "}
      <Link to="/markets/$state/$city" params={{ state: state.toLowerCase(), city: city.toLowerCase().replace(/\s+/g, "-") }} className="hover:text-foreground">Markets in {city}</Link>
    </p>
  );
}
