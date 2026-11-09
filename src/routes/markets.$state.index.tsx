import { createFileRoute, notFound } from "@tanstack/react-router";
import { getPlaceDirectory } from "@/lib/directory.functions";
import { getSiteOrigin } from "@/lib/site.functions";
import { PlacePage } from "@/components/PlacePage";
import { BRAND } from "@/lib/brand";

export const Route = createFileRoute("/markets/$state/")({
  loader: async ({ params }) => {
    const [place, origin] = await Promise.all([getPlaceDirectory({ data: { state: params.state } }), getSiteOrigin()]);
    if (!place) throw notFound();
    return { place, canonical: `${origin}/markets/${params.state.toLowerCase()}` };
  },
  head: ({ loaderData }) => {
    if (!loaderData) return { meta: [{ title: `Markets — ${BRAND}` }, { name: "robots", content: "noindex" }] };
    const { place, canonical } = loaderData;
    const title = `Farmers, night & flea markets in ${place.state} — ${BRAND}`;
    return {
      meta: [{ title }, { name: "description", content: `${place.markets.length} markets in ${place.state} with verified hours, locations and vendor information.` }, { property: "og:title", content: title }, ...(place.markets.length < 3 ? [{ name: "robots", content: "noindex, follow" }] : [])],
      links: [{ rel: "canonical", href: canonical }],
    };
  },
  component: () => <PlacePage place={Route.useLoaderData().place} />,
});
