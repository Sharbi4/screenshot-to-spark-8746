import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

/** Tasteful organizer invitation shown near the bottom of unclaimed market profiles. */
export function ManageMarketInvite({ slug }: { slug: string }) {
  return (
    <section aria-labelledby="manage-market" className="rounded-3xl bg-card p-6 shadow-soft md:p-8">
      <p className="eyebrow text-sage">For organizers</p>
      <h2 id="manage-market" className="mt-2 text-2xl font-semibold tracking-tight md:text-3xl">
        Do you manage this market?
      </h2>
      <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
        Take control of your market profile, manage vendor applications, organize booth assignments, and simplify bookings with MarketBloom.
      </p>
      <Link
        to="/manage/$slug"
        params={{ slug }}
        className="tap mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground"
      >
        Manage This Market <ArrowRight className="h-4 w-4" />
      </Link>
    </section>
  );
}
