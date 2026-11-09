import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Store, Tent, LogOut, Plus, Check } from "lucide-react";
import { usePartnerSession } from "@/components/PartnerSession";
import { supabase } from "@/integrations/supabase/client";
import { getPartner, savePartner, addMarket, saveStall } from "@/lib/partner.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Page } from "@/components/PageTransition";
import type { Database } from "@/integrations/supabase/types";
import { VendorPublicProfile } from "@/components/VendorPublicProfile";
import { VerifiedMarkets } from "@/components/VerifiedMarkets";

export const Route = createFileRoute("/partner")({ head: () => ({ meta: [
  { title: "Marketpartner onboarding — Vendibook" }, { name: "description", content: "Create your vendor or organizer profile and manage market stalls." }, { property: "og:title", content: "Marketpartner onboarding — Vendibook" }, { property: "og:description", content: "Your business, markets, and stall details in one place." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
] }), component: Partner });

function Field({ label, name, value, type = "text", required = true }: { label: string; name: string; value?: string | number | undefined; type?: string; required?: boolean }) {
  return <label className="block text-sm font-medium">{label}<Input className="mt-2" name={name} defaultValue={value} type={type} required={required} min={type === "number" ? 0 : undefined} step={type === "number" ? "any" : undefined} /></label>;
}
function Partner() {
  const { user, ready } = usePartnerSession(); const queryClient = useQueryClient(); const navigate = useNavigate();
  const load = useServerFn(getPartner); const save = useServerFn(savePartner); const createMarket = useServerFn(addMarket);
  const { data, isLoading, error } = useQuery({ queryKey: ["partner", user?.id], queryFn: () => load(), enabled: Boolean(user), retry: false });
  const [role, setRole] = useState<"vendor" | "organizer" | "both">("vendor"); const [editing, setEditing] = useState(false); const [adding, setAdding] = useState(false); const [busy, setBusy] = useState(false); const [message, setMessage] = useState("");
  const profile = data?.profile;
  async function run(action: () => Promise<unknown>) { setBusy(true); setMessage(""); try { await action(); await queryClient.invalidateQueries({ queryKey: ["partner"] }); setEditing(false); setAdding(false); setMessage("Saved successfully."); } catch (e) { setMessage(e instanceof Error ? e.message : "Could not save."); } finally { setBusy(false); } }
  return <Page className="mx-auto max-w-4xl px-5 pb-32 pt-8">
    <div className="flex items-center justify-between gap-4"><p className="eyebrow text-sage">Vendibook · Partner workspace</p>{user && <Button aria-label="Sign out" title="Sign out" variant="ghost" size="icon" onClick={async () => { await queryClient.cancelQueries(); queryClient.clear(); await supabase.auth.signOut(); await navigate({ to: "/auth", replace: true }); }}><LogOut /></Button>}</div>
    <h1 className="display mt-4 text-5xl">Marketpartner</h1>
    {!ready || (user && isLoading) ? <p className="mt-8">Loading your account…</p> : !user ? <div className="mt-8"><h2 className="text-2xl font-semibold">Your next chapter at the market.</h2><div className="mt-6 flex gap-5 text-muted-foreground"><span className="flex items-center gap-2"><Store />Vendors</span><span className="flex items-center gap-2"><Tent />Organizers</span></div><Button asChild className="mt-8"><Link to="/auth">Sign in or create account</Link></Button></div> : error ? <p role="alert" className="mt-8">Could not load your account. Please refresh.</p> : <>
      {!profile?.onboarding_complete || editing ? <section className="mt-8">
        <p className="eyebrow text-muted-foreground">01 / Business profile</p><h2 className="mt-2 text-2xl font-semibold">Let’s get you market-ready.</h2>
        <div className="mt-5 flex flex-wrap gap-2">{(["vendor", "organizer", "both"] as const).map(value => <Button key={value} variant={role === value ? "default" : "outline"} aria-pressed={role === value} onClick={() => setRole(value)}>{value === "vendor" ? <Store /> : <Tent />}{value === "both" ? "Both" : value === "vendor" ? "Vendor" : "Organizer"}</Button>)}</div>
        <form className="mt-6 grid gap-5 sm:grid-cols-2" onSubmit={event => { event.preventDefault(); const f = new FormData(event.currentTarget); void run(() => save({ data: { display_name: String(f.get("display_name")), business_name: String(f.get("business_name")), participation: role, city: String(f.get("city")), phone: String(f.get("phone")), category: String(f.get("category")), description: String(f.get("description")) } })); }}>
          <Field label="Your name" name="display_name" value={profile?.display_name} /><Field label="Business name" name="business_name" value={profile?.business_name} /><Field label="City" name="city" value={profile?.city} /><Field label="Phone (optional)" name="phone" value={profile?.phone} required={false} /><Field label="Business category" name="category" value={profile?.category} required={false} />
          <label className="block text-sm font-medium sm:col-span-2">About your business<Textarea name="description" defaultValue={profile?.description} className="mt-2" /></label>
          <div className="sm:col-span-2"><Button disabled={busy}><Check />{busy ? "Saving…" : "Save business profile"}</Button>{editing && <Button variant="ghost" onClick={() => setEditing(false)} type="button">Cancel</Button>}</div>
        </form>
      </section> : <>
        <section className="mt-8 border-b pb-6"><p className="eyebrow text-sage">Profile complete · {profile.participation}</p><div className="mt-2 flex flex-wrap items-start justify-between gap-4"><div><h2 className="text-3xl font-semibold">{profile.business_name}</h2><p className="mt-2 text-muted-foreground">{profile.display_name} · {profile.city}{profile.category && ` · ${profile.category}`}</p><p className="mt-3 text-muted-foreground">{profile.description}</p></div><Button variant="outline" onClick={() => { setRole(profile.participation === "both" ? "both" : profile.participation === "organizer" ? "organizer" : "vendor"); setEditing(true); }}>Edit profile</Button></div></section>
        {(profile.participation === "vendor" || profile.participation === "both") && <VendorPublicProfile userId={user.id} businessName={profile.business_name} category={profile.category} description={profile.description} city={profile.city} />}
        {(profile.participation === "organizer" || profile.participation === "both") && <VerifiedMarkets userId={user.id} />}
        {(profile.participation === "organizer" || profile.participation === "both") && <section className="mt-8"><div className="flex items-center justify-between"><h2 className="text-2xl font-semibold">Your markets</h2><Button variant="secondary" onClick={() => setAdding(!adding)}><Plus />Add market</Button></div>
          {adding && <form className="mt-6 grid gap-4 border-b pb-6 sm:grid-cols-2" onSubmit={event => { event.preventDefault(); const f = new FormData(event.currentTarget); void run(() => createMarket({ data: { name: String(f.get("name")), city: String(f.get("city")), address: String(f.get("address")), schedule: String(f.get("schedule")), hours: String(f.get("hours")), description: String(f.get("description")) } })); }}>
            <Field label="Market name" name="name" /><Field label="City" name="city" /><Field label="Street address" name="address" /><Field label="Market days" name="schedule" /><Field label="Opening hours" name="hours" /><Field label="Description" name="description" required={false} /><Button disabled={busy}>Save market</Button>
          </form>}
          {!data?.markets.length && !adding && <p className="mt-5 text-muted-foreground">No markets yet.</p>}
          {data?.markets.map(market => <section key={market.id} className="mt-8 border-b pb-8"><h3 className="text-xl font-semibold">{market.name}</h3><p className="mt-1 text-sm text-muted-foreground">{market.address}, {market.city} · {market.schedule} · {market.hours}</p><Stalls marketId={market.id} stalls={market.partner_stalls} /></section>)}
        </section>}
        {(profile.participation === "vendor" || profile.participation === "both") && <section className="mt-8"><h2 className="text-2xl font-semibold">Find your next market</h2><Button asChild className="mt-4" variant="outline"><Link to="/">Explore markets</Link></Button></section>}
      </>}
    </>}
    {message && <p role="status" className="mt-5 text-sm text-sage">{message}</p>}
  </Page>;
}
type Stall = Database["public"]["Tables"]["partner_stalls"]["Row"];
function Stalls({ marketId, stalls }: { marketId: string; stalls: Stall[] }) {
  const [edit, setEdit] = useState<Stall | "new" | null>(null); const [message, setMessage] = useState(""); const [busy, setBusy] = useState(false);
  const save = useServerFn(saveStall); const queryClient = useQueryClient(); const selected = edit && edit !== "new" ? edit : null;
  return <div className="mt-5"><div className="flex justify-between items-center"><p className="eyebrow text-muted-foreground">Stalls · {stalls.length}</p><Button variant="ghost" onClick={() => setEdit("new")}><Plus />Add stall</Button></div>
    <div className="mt-3 grid gap-3 sm:grid-cols-2">{stalls.map(stall => <article key={stall.id} className="rounded-lg border p-4"><div className="flex justify-between gap-2"><Link to="/stalls/$id" params={{ id: stall.id }} className="font-semibold underline underline-offset-4">{stall.label}</Link><span className="text-sm text-sage">{stall.availability}</span></div><p className="mt-2 text-sm text-muted-foreground">{stall.width_ft} × {stall.depth_ft} ft · ${stall.daily_price} / day</p><Button variant="link" size="sm" onClick={() => setEdit(stall)}>Edit stall</Button></article>)}</div>
    {edit && <form key={selected?.id ?? "new"} className="mt-5 grid gap-4 sm:grid-cols-2" onSubmit={async event => { event.preventDefault(); setBusy(true); setMessage(""); const f = new FormData(event.currentTarget); try { await save({ data: { id: selected?.id, market_id: marketId, label: String(f.get("label")), width_ft: Number(f.get("width_ft")), depth_ft: Number(f.get("depth_ft")), daily_price: Number(f.get("daily_price")), availability: f.get("availability"), amenities: f.getAll("amenities"), notes: String(f.get("notes")) } }); await queryClient.invalidateQueries({ queryKey: ["partner"] }); setEdit(null); } catch (e) { setMessage(e instanceof Error ? e.message : "Could not save stall."); } finally { setBusy(false); } }}>
      <Field label="Stall label" name="label" value={selected?.label} /><Field label="Price per day (USD)" name="daily_price" type="number" value={selected?.daily_price} /><Field label="Width (feet)" name="width_ft" type="number" value={selected?.width_ft} /><Field label="Depth (feet)" name="depth_ft" type="number" value={selected?.depth_ft} />
      <label className="text-sm font-medium">Availability<select name="availability" defaultValue={selected?.availability ?? "available"} className="mt-2 block h-9 w-full rounded-md border bg-background px-3"><option value="available">Available</option><option value="reserved">Reserved</option><option value="unavailable">Unavailable</option></select></label>
      <fieldset className="sm:col-span-2"><legend className="text-sm font-medium">Amenities</legend><div className="mt-2 flex flex-wrap gap-4">{["power", "water", "corner", "shade", "wifi", "parking"].map(item => <label key={item} className="flex items-center gap-2 text-sm capitalize"><input type="checkbox" name="amenities" value={item} defaultChecked={selected?.amenities.includes(item)} />{item}</label>)}</div></fieldset>
      <label className="sm:col-span-2 text-sm font-medium">Stall notes<Textarea name="notes" defaultValue={selected?.notes} className="mt-2" /></label><div><Button disabled={busy}>{busy ? "Saving…" : "Save stall"}</Button><Button variant="ghost" type="button" onClick={() => setEdit(null)}>Cancel</Button></div>
    </form>}{message && <p role="alert" className="mt-3 text-sm text-destructive">{message}</p>}
  </div>;
}