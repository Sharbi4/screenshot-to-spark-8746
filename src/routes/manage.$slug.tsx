import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Check, Lock, Clock, ChevronLeft, ShieldCheck, LoaderCircle } from "lucide-react";
import { Page } from "@/components/PageTransition";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { usePartnerSession } from "@/components/PartnerSession";
import { getMarketProfile } from "@/lib/directory.functions";
import { getMyMarketClaim, submitMarketClaim, withdrawMarketClaim } from "@/lib/claims.functions";
import { BRAND } from "@/lib/brand";

export const Route = createFileRoute("/manage/$slug")({
  loader: async ({ params }) => {
    const market = await getMarketProfile({ data: { slug: params.slug } });
    if (!market) throw notFound();
    return { id: market.id, slug: market.slug, name: market.name, city: market.city, claimed: market.claimed, example: market.source === "example" };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `Manage ${loaderData?.name ?? "your market"} — ${BRAND}` },
      { name: "description", content: "Claim your market profile, verify your authority, and set up vendor applications, booths, and bookings." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ManageMarket,
});

const steps = [
  ["Claim your market", "Tell us who you are and your role."],
  ["Create your Market Partner account", "Sign in or create a Market Partner account."],
  ["Verify authority", "We confirm you manage this market before handing over control."],
  ["Review market details", "Check hours, address, and description."],
  ["Branding & photography", "Add your logo and photos you have rights to use."],
  ["Operating dates", "Set your season and recurring market days."],
  ["Booth types & prices", "Sizes, amenities, and pricing."],
  ["Vendor applications", "Build your application in Application Studio."],
  ["Connect Square", "Required before accepting paid reservations."],
  ["Publish & invite vendors", "Go live and invite the vendors you already work with."],
] as const;

type StepState = "done" | "current" | "waiting" | "locked";

function Steps({ states }: { states: StepState[] }) {
  return (
    <ol className="overflow-hidden rounded-3xl bg-card shadow-soft">
      {steps.map(([title, hint], i) => {
        const s = states[i] ?? "locked";
        return (
          <li key={title} className={`flex items-center gap-4 px-5 py-4 ${i ? "border-t" : ""}`} aria-current={s === "current" ? "step" : undefined}>
            <span
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                s === "done" ? "bg-sage text-sage-foreground" : s === "current" ? "bg-primary text-primary-foreground" : s === "waiting" ? "bg-honey text-honey-foreground" : "bg-secondary text-muted-foreground"
              }`}
            >
              {s === "done" ? <Check className="h-4 w-4" /> : s === "waiting" ? <Clock className="h-4 w-4" /> : s === "locked" ? <Lock className="h-3.5 w-3.5" /> : i + 1}
            </span>
            <span className="min-w-0 flex-1">
              <span className={`block font-medium ${s === "locked" ? "text-muted-foreground" : ""}`}>{title}</span>
              <span className="block text-sm text-muted-foreground">{hint}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function ManageMarket() {
  const market = Route.useLoaderData();
  const { user, ready } = usePartnerSession();
  const queryClient = useQueryClient();
  const loadClaim = useServerFn(getMyMarketClaim);
  const submit = useServerFn(submitMarketClaim);
  const withdraw = useServerFn(withdrawMarketClaim);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const enabled = Boolean(user && market.id);
  const { data, isLoading } = useQuery({
    queryKey: ["market-claim", user?.id, market.id],
    queryFn: () => loadClaim({ data: { market_id: market.id! } }),
    enabled,
    retry: false,
  });
  const claim = data?.claim;
  const pending = claim?.status === "pending";
  const approved = data?.isOwner || claim?.status === "approved";
  const states: StepState[] = approved
    ? ["done", "done", "done", "current"]
    : pending
      ? ["done", "done", "waiting"]
      : user
        ? ["current", "done"]
        : ["current", "current"];

  async function act(fn: () => Promise<unknown>) {
    setBusy(true);
    setError("");
    try {
      await fn();
      await queryClient.invalidateQueries({ queryKey: ["market-claim"] });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Page className="mx-auto max-w-3xl px-5 pb-32 pt-[max(1.5rem,env(safe-area-inset-top))]">
      <Link to="/m/$slug" params={{ slug: market.slug }} className="tap glass inline-flex rounded-full p-2.5 shadow-soft" aria-label="Back to market">
        <ChevronLeft className="h-5 w-5" />
      </Link>
      <p className="eyebrow mt-6 text-sage">Market Partner onboarding · {market.city}</p>
      <h1 className="display mt-3 text-4xl md:text-5xl">Manage {market.name}</h1>
      <p className="mt-4 max-w-xl text-[17px] leading-relaxed text-muted-foreground">
        Take control of your market profile, manage vendor applications, organize booth assignments, and simplify bookings.
      </p>

      <div className="mt-8 grid gap-8 md:grid-cols-[1fr_1.1fr] md:items-start">
        <Steps states={market.example ? [] : states} />

        <section aria-live="polite">
          {market.example ? (
            <div className="rounded-3xl bg-card p-6 shadow-soft">
              <h2 className="text-xl font-semibold tracking-tight">This is an example listing</h2>
              <p className="mt-2 text-[15px] text-muted-foreground">Example listings can't be claimed. List your own market and start building its profile today.</p>
              <Button asChild className="mt-5 rounded-full"><Link to="/partner">List your market</Link></Button>
            </div>
          ) : market.claimed && !approved ? (
            <div className="rounded-3xl bg-card p-6 shadow-soft">
              <ShieldCheck className="h-6 w-6 text-sage" />
              <h2 className="mt-3 text-xl font-semibold tracking-tight">Managed by a verified Market Partner</h2>
              <p className="mt-2 text-[15px] text-muted-foreground">If you believe this is a mistake, contact MarketBloom support.</p>
            </div>
          ) : !ready || (enabled && isLoading) ? (
            <p role="status" className="flex items-center gap-2 text-muted-foreground"><LoaderCircle className="h-4 w-4 animate-spin motion-reduce:animate-none" />Loading…</p>
          ) : !user ? (
            <div className="rounded-3xl bg-card p-6 shadow-soft">
              <h2 className="text-xl font-semibold tracking-tight">Start with your Market Partner account</h2>
              <p className="mt-2 text-[15px] text-muted-foreground">Sign in or create an account, then tell us about your role at {market.name}.</p>
              <Button asChild className="mt-5 rounded-full"><Link to="/auth" search={{ redirect: `/manage/${market.slug}` }}>Sign in or create account</Link></Button>
            </div>
          ) : approved ? (
            <div className="rounded-3xl bg-card p-6 shadow-soft">
              <ShieldCheck className="h-6 w-6 text-sage" />
              <h2 className="mt-3 text-xl font-semibold tracking-tight">You're verified</h2>
              <p className="mt-2 text-[15px] text-muted-foreground">You now manage this market. Continue setup in your partner workspace.</p>
              <Button asChild className="mt-5 rounded-full"><Link to="/partner">Continue setup</Link></Button>
            </div>
          ) : pending && claim ? (
            <div className="rounded-3xl bg-card p-6 shadow-soft">
              <Clock className="h-6 w-6 text-honey" />
              <h2 className="mt-3 text-xl font-semibold tracking-tight">Verification in progress</h2>
              <p className="mt-2 text-[15px] text-muted-foreground">
                We received your claim as {claim.role_title}. We'll confirm your authority at {claim.work_email} before you can edit the page or accept payments.
              </p>
              <p className="mt-4 text-xs text-muted-foreground">Submitted {new Date(claim.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
              <Button variant="ghost" className="mt-3" disabled={busy} onClick={() => void act(() => withdraw({ data: { id: claim.id } }))}>Withdraw claim</Button>
            </div>
          ) : (
            <form
              className="space-y-4 rounded-3xl bg-card p-6 shadow-soft"
              onSubmit={(event) => {
                event.preventDefault();
                const f = new FormData(event.currentTarget);
                void act(() =>
                  submit({
                    data: {
                      market_id: market.id!,
                      full_name: String(f.get("full_name")),
                      role_title: String(f.get("role_title")),
                      work_email: String(f.get("work_email")),
                      phone: String(f.get("phone") ?? ""),
                      evidence: String(f.get("evidence") ?? ""),
                      attest: f.get("attest") === "on",
                    },
                  }),
                );
              }}
            >
              {claim && claim.status === "rejected" && (
                <p className="rounded-2xl bg-secondary px-4 py-3 text-sm">Your previous claim wasn't approved{claim.reviewer_notes ? `: ${claim.reviewer_notes}` : "."} You can submit new details.</p>
              )}
              <h2 className="text-xl font-semibold tracking-tight">Claim this market</h2>
              <label className="block text-sm font-medium">Your full name<Input className="mt-2" name="full_name" autoComplete="name" required maxLength={120} /></label>
              <label className="block text-sm font-medium">Your role<Input className="mt-2" name="role_title" placeholder="Market manager, board member…" required maxLength={120} /></label>
              <label className="block text-sm font-medium">Work email<Input className="mt-2" name="work_email" type="email" autoComplete="email" defaultValue={user.email ?? ""} required /></label>
              <label className="block text-sm font-medium">Phone (optional)<Input className="mt-2" name="phone" type="tel" autoComplete="tel" maxLength={40} /></label>
              <label className="block text-sm font-medium">
                How can we verify your role?
                <Textarea className="mt-2" name="evidence" maxLength={2000} placeholder="For example: the market website lists you as a contact, or your email uses the market's domain." />
              </label>
              <label className="flex items-start gap-3 text-sm">
                <input type="checkbox" name="attest" required className="mt-0.5 h-4 w-4 accent-[var(--primary)]" />
                <span>I'm authorized to manage this market's profile and bookings.</span>
              </label>
              {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
              <Button className="w-full rounded-full" disabled={busy}>{busy && <LoaderCircle className="animate-spin motion-reduce:animate-none" />}{busy ? "Submitting…" : "Submit for verification"}</Button>
            </form>
          )}
          {error && (pending || approved) && <p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}
          <p className="mt-6 text-sm text-muted-foreground">
            Not listed yet? <Link to="/partner" className="font-semibold text-foreground underline underline-offset-4">Create a new market</Link>
          </p>
        </section>
      </div>
    </Page>
  );
}
