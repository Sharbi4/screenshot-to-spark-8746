import { useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { CalendarDays, ArrowUpRight } from "lucide-react";
import { bookingRequestsOptions } from "@/lib/bookings.functions";
import { getMarket } from "@/lib/markets";
import { BookingSummary } from "./BookingSummary";
import { Button } from "./ui/button";

export function SavedStudio({ userId }: { userId: string }) {
  const { data: requests } = useSuspenseQuery(bookingRequestsOptions(userId));
  const pending = requests.filter((request) => request.status === "Pending").length;
  return <>
    <div className="mt-8 flex flex-wrap gap-10 border-y py-6">
      <div><p className="display text-4xl">{requests.length}</p><p className="mt-1 text-sm text-muted-foreground">Booking requests</p></div>
      <div><p className="display text-4xl">{pending}</p><p className="mt-1 text-sm text-muted-foreground">Pending approval</p></div>
    </div>
    <div className="mt-8 flex items-center justify-between gap-3"><h2 className="text-2xl font-semibold">Your requests</h2><Button asChild variant="secondary"><Link to="/"><CalendarDays />Book a space</Link></Button></div>
    {!requests.length ? <div className="py-12"><CalendarDays className="h-8 w-8 text-sage" /><h3 className="mt-4 text-xl font-semibold">No booking requests yet</h3></div> : <ul className="mt-4 space-y-3">{requests.map((request) => {
      const market = getMarket(request.market_id);
      const date = new Date(`${request.booking_date}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
      return <li key={request.id} className="rounded-3xl bg-card p-4 shadow-soft">
        <div className="flex flex-wrap items-start gap-3 sm:flex-nowrap">
          {market && <img src={market.images[0]} alt="" className="h-16 w-16 shrink-0 rounded-2xl object-cover" />}
          <div className="min-w-0 flex-1"><h3 className="break-words font-semibold">{market ? request.market_name : request.stall_label}</h3><p className="mt-1 text-sm text-muted-foreground">{date}</p><p className="mt-1 break-words text-sm text-muted-foreground">{request.stall_label} · ${request.daily_price} / day</p>{request.notes && <p className="mt-2 whitespace-pre-wrap break-words text-sm text-muted-foreground">{request.notes}</p>}</div>
          <span className="shrink-0 rounded-full bg-honey/20 px-3 py-1 text-xs font-semibold text-honey-foreground">{request.status}</span>
          {request.stall_id ? <Button asChild variant="ghost" size="icon"><Link to="/stalls/$id" params={{ id: request.stall_id }} aria-label="View stall"><ArrowUpRight /></Link></Button> : market ? <Button asChild variant="ghost" size="icon"><Link to="/listing/$id" params={{ id: market.id }} aria-label="View market"><ArrowUpRight /></Link></Button> : null}
        </div>
        <BookingSummary bookingId={request.id} />
      </li>;
    })}</ul>}
  </>;
}