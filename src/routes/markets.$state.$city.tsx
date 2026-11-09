import { createFileRoute, notFound } from "@tanstack/react-router";
import { getPlaceDirectory } from "@/lib/directory.functions";
import { getSiteOrigin } from "@/lib/site.functions";
import { PlacePage } from "@/components/PlacePage";
import { BRAND } from "@/lib/brand";

export const Route = createFileRoute("/markets/$state/$city")({
  loader: async ({ params }) => {
    const [place, origin] = await Promise.all([getPlaceDirectory({ data: { state: params.state, city: params.city } }), getSiteOrigin()]);
    if (!place) throw notFound();
    return { place, canonical: `${origin}/markets/${params.state.toLowerCase()}/${params.city}` };
  },
  head: ({ loaderData }) => {
    if (!loaderData) return { meta: [{ title: `Markets — ${BRAND}` }, { name: "robots", content: "noindex" }] };
    const { place, canonical } = loaderData;
    const title = `Markets in ${place.city}, ${place.state} — ${BRAND}`;
    return {
      meta: [{ title }, { name: "description", content: `Farmers markets, night markets and more in ${place.city}, ${place.state}: verified hours, locations and vendor information.` }, { property: "og:title", content: title }, ...(place.markets.length < 3 ? [{ name: "robots", content: "noindex, follow" }] : [])],
      links: [{ rel: "canonical", href: canonical }],
    };
  },
  component: () => <PlacePage place={Route.useLoaderData().place} />,
});
