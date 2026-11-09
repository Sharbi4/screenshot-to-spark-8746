import { createFileRoute, Link } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { Page } from "@/components/PageTransition";
import { BRAND } from "@/lib/brand";

const getStates = createServerFn({ method: "GET" }).handler(async () => {
  const { createPublicClient } = await import("@/lib/supabase-public.server");
  const client = createPublicClient();
  if (!client) return [];
  const { data, error } = await client.from("markets").select("state").eq("published", true).neq("state", "").limit(10000);
  if (error || !data) return [];
  const counts = new Map<string, number>();
  for (const r of data) counts.set(r.state, (counts.get(r.state) ?? 0) + 1);
  return [...counts.entries()].map(([state, count]) => ({ state, count })).sort((a, b) => a.state.localeCompare(b.state));
});

export const Route = createFileRoute("/markets/")({
  loader: () => getStates(),
  head: () => ({ meta: [{ title: `Markets by state — ${BRAND}` }, { name: "description", content: "Browse farmers markets, night markets, flea markets and more across the United States." }] }),
  component: MarketsIndex,
});

function MarketsIndex() {
  const states = Route.useLoaderData();
  return (
    <Page className="mx-auto max-w-3xl px-5 pb-32 pt-[max(2rem,env(safe-area-inset-top))]">
      <p className="eyebrow text-sage">Directory</p>
      <h1 className="display mt-3 text-5xl md:text-6xl">Markets by state</h1>
      {states.length ? (
        <div className="mt-8 flex flex-wrap gap-2">
          {states.map((s) => (
            <Link key={s.state} to="/markets/$state" params={{ state: s.state.toLowerCase() }} className="tap rounded-full bg-card px-4 py-2.5 text-sm font-semibold shadow-soft">{s.state} <span className="font-normal text-muted-foreground">{s.count}</span></Link>
          ))}
        </div>
      ) : (
        <p className="mt-6 text-muted-foreground">The national directory is being verified. Published markets will appear here.</p>
      )}
    </Page>
  );
}
