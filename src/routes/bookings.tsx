import { createFileRoute, Link } from "@tanstack/react-router";
import { Page } from "@/components/PageTransition";
import { Suspense } from "react";
import { SavedStudio } from "@/components/SavedStudio";
import { usePartnerSession } from "@/components/PartnerSession";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/bookings")({
  head: () => ({
    meta: [
      { title: "Studio — Vendibook" },
      { name: "description", content: "Your upcoming markets, earnings, and permits in one place." },
      { property: "og:title", content: "Studio — Vendibook" },
      { property: "og:description", content: "Your upcoming markets, earnings, and permits in one place." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Studio,
});

function Studio() {
  const { user, ready } = usePartnerSession();
  if (!ready) return <Page className="mx-auto max-w-5xl px-5 py-12"><p role="status">Loading Studio…</p></Page>;
  if (user) return <Page className="mx-auto max-w-5xl px-5 pb-32 pt-10"><p className="eyebrow text-sage">Vendibook</p><h1 className="display mt-2 text-5xl">Studio</h1><Suspense fallback={<p role="status" className="mt-8 text-muted-foreground">Loading your requests…</p>}><SavedStudio userId={user.id} /></Suspense></Page>;
  return <Page className="mx-auto max-w-5xl px-5 pb-32 pt-10"><h1 className="display text-5xl">Studio</h1><Button asChild className="mt-6"><Link to="/auth">Sign in to view your requests</Link></Button></Page>;
}
