import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowUpRight, Plus, ShieldCheck, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cancelVendorAppearance, confirmVendorAppearance, getMyVerifiedMarkets } from "@/lib/vendor-profile.functions";
import { formatDay } from "./VendorDirectory";

/** Verified organizers confirm vendors for dates; this drives the public vendor directory and vendor calendars. */
export function VerifiedMarkets({ userId }: { userId: string }) {
  const load = useServerFn(getMyVerifiedMarkets);
  const { data: markets = [] } = useQuery({ queryKey: ["verified-markets", userId], queryFn: () => load(), retry: false });
  if (!markets.length) return null;
  return (
    <section className="mt-8 border-b pb-8">
      <p className="eyebrow flex items-center gap-1.5 text-sage"><ShieldCheck className="h-3.5 w-3.5" />Verified organizer</p>
      <h2 className="mt-2 text-2xl font-semibold">Your public markets</h2>
      {markets.map((m) => <MarketVendors key={m.id} userId={userId} market={m} />)}
    </section>
  );
}

type VerifiedMarket = Awaited<ReturnType<typeof getMyVerifiedMarkets>>[number];

function MarketVendors({ userId, market }: { userId: string; market: VerifiedMarket }) {
  const confirm = useServerFn(confirmVendorAppearance);
  const cancel = useServerFn(cancelVendorAppearance);
  const queryClient = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    setError("");
    try {
      await fn();
      await queryClient.invalidateQueries({ queryKey: ["verified-markets", userId] });
      setAdding(false);
    } catch (e) {
      setError(e instanceof Error ? e.message.split("\n")[0]! : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-xl font-semibold">{market.name}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{market.city} · {market.appearances.length} upcoming confirmed</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="ghost"><Link to="/m/$slug" params={{ slug: market.slug }}>Public page<ArrowUpRight /></Link></Button>
          <Button variant="secondary" onClick={() => setAdding(!adding)}><Plus />Confirm vendor</Button>
        </div>
      </div>
      {adding && (
        <form
          className="mt-4 grid gap-4 sm:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault();
            const f = new FormData(event.currentTarget);
            void run(() => confirm({ data: { market_id: market.id, vendor_slug: String(f.get("vendor_slug")).replace(/^.*\/v\//, ""), appearance_date: String(f.get("date")), booth_label: String(f.get("booth")), featured: f.get("featured") === "on" } }));
          }}
        >
          <label className="block text-sm font-medium">Vendor profile address<Input className="mt-2" name="vendor_slug" placeholder="maple-bakery" required /></label>
          <label className="block text-sm font-medium">Market date<Input className="mt-2" name="date" type="date" required /></label>
          <label className="block text-sm font-medium">Booth (optional)<Input className="mt-2" name="booth" maxLength={40} placeholder="B-14" /></label>
          <label className="flex items-center gap-3 self-end pb-2 text-sm"><input type="checkbox" name="featured" className="h-4 w-4" />Feature on market page</label>
          <div className="sm:col-span-2"><Button disabled={busy}>{busy ? "Confirming…" : "Confirm participation"}</Button></div>
        </form>
      )}
      {error && <p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}
      {market.appearances.length > 0 && (
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {market.appearances.map((a) => (
            <li key={a.id} className="rounded-lg border p-4">
              <div className="flex justify-between gap-2">
                <span className="font-semibold">{a.vendor?.name ?? "Unpublished vendor"}</span>
                {a.featured && <Star className="h-4 w-4 fill-honey text-honey" aria-label="Featured" />}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{formatDay(a.date)}{a.booth && ` · Booth ${a.booth}`}</p>
              <Button variant="link" size="sm" className="px-0" disabled={busy} onClick={() => void run(() => cancel({ data: { id: a.id } }))}>Cancel appearance</Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
