import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ChevronRight, Store, CreditCard, Bell, FileText, HelpCircle } from "lucide-react";
import { Page } from "@/components/PageTransition";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Profile — Vendibook" },
      { name: "description", content: "Manage your vendor profile, payouts, and documents." },
      { property: "og:title", content: "Profile — Vendibook" },
      { property: "og:description", content: "Manage your vendor profile, payouts, and documents." },
    ],
  }),
  component: Profile,
});

const rows = [
  { icon: Store, label: "Storefront", hint: "Maya's Mochi Co." },
  { icon: CreditCard, label: "Payouts", hint: "•••• 4021" },
  { icon: FileText, label: "Permits & insurance", hint: "2 on file" },
  { icon: Bell, label: "Notifications", hint: "On" },
  { icon: HelpCircle, label: "Help", hint: "" },
];

function Profile() {
  return (
    <Page className="mx-auto max-w-xl px-5 pb-32 pt-[max(1.5rem,env(safe-area-inset-top))]">
      <div className="flex flex-col items-center text-center">
        <img
          src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=300&q=80"
          alt="Maya Chen"
          className="h-24 w-24 rounded-full object-cover shadow-float"
        />
        <h1 className="display mt-4 text-4xl">Maya Chen</h1>
        <p className="mt-1 text-sm text-muted-foreground">Vendor since 2023 · Phoenix</p>
        <div className="mt-6 grid w-full grid-cols-3 gap-2">
          {[["48", "Markets"], ["4.97", "Rating"], ["Gold", "Tier"]].map(([v, l]) => (
            <div key={l} className="rounded-2xl bg-card p-4 shadow-soft">
              <p className="text-xl font-semibold tracking-tight">{v}</p>
              <p className="text-xs text-muted-foreground">{l}</p>
            </div>
          ))}
        </div>
      </div>
      <ul className="mt-8 overflow-hidden rounded-3xl bg-card shadow-soft">
        {rows.map(({ icon: Icon, label, hint }, i) => (
          <motion.li key={label} whileTap={{ scale: 0.98 }} className={`flex items-center gap-4 px-5 py-4 ${i ? "border-t" : ""}`}>
            <Icon className="h-5 w-5 text-sage" />
            <span className="flex-1 font-medium">{label}</span>
            <span className="text-sm text-muted-foreground">{hint}</span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </motion.li>
        ))}
      </ul>
    </Page>
  );
}
