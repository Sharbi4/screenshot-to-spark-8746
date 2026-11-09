import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowUpRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getMyVendorProfile, saveMyVendorProfile } from "@/lib/vendor-profile.functions";
import { slugify } from "@/lib/marketplace-schema";

function Field({ label, name, value, type = "text", required = false, placeholder, hint }: { label: string; name: string; value?: string | null | undefined; type?: string; required?: boolean; placeholder?: string; hint?: string }) {
  return (
    <label className="block text-sm font-medium">
      {label}
      <Input className="mt-2" name={name} defaultValue={value ?? ""} type={type} required={required} placeholder={placeholder} />
      {hint && <span className="mt-1 block text-xs font-normal text-muted-foreground">{hint}</span>}
    </label>
  );
}

/** Vendor's reusable public business profile (/v/:slug), edited inside the partner workspace. */
export function VendorPublicProfile({ userId, businessName, category, description, city }: { userId: string; businessName: string; category: string; description: string; city: string }) {
  const load = useServerFn(getMyVendorProfile);
  const save = useServerFn(saveMyVendorProfile);
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["vendor-profile", userId], queryFn: () => load(), retry: false });
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const p = data?.profile;

  if (isLoading) return <p role="status" className="mt-5 text-muted-foreground">Loading public profile…</p>;
  if (data && !data.available) return null;

  return (
    <section className="mt-8 border-b pb-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow text-muted-foreground">Public profile</p>
          <h2 className="mt-2 text-2xl font-semibold">{p ? p.business_name : "Show shoppers who you are"}</h2>
          <p className="mt-2 text-muted-foreground">
            {p ? (p.published ? "Live. Markets that confirm you link here automatically." : "Draft. Only you can see it.") : "One profile for every market you sell at: products, links, and upcoming dates."}
          </p>
        </div>
        <div className="flex gap-2">
          {p?.published && (
            <Button asChild variant="outline"><Link to="/v/$slug" params={{ slug: p.slug }}>View<ArrowUpRight /></Link></Button>
          )}
          {!editing && <Button variant={p ? "outline" : "default"} onClick={() => setEditing(true)}>{p ? "Edit public profile" : "Create public profile"}</Button>}
        </div>
      </div>

      {editing && (
        <form
          className="mt-6 grid gap-5 sm:grid-cols-2"
          onSubmit={async (event) => {
            event.preventDefault();
            const f = new FormData(event.currentTarget);
            setBusy(true);
            setMessage(null);
            try {
              await save({
                data: {
                  slug: String(f.get("slug")),
                  business_name: String(f.get("business_name")),
                  category: String(f.get("category")),
                  tagline: String(f.get("tagline")),
                  description: String(f.get("description")),
                  service_area: String(f.get("service_area")),
                  logo_url: String(f.get("logo_url")),
                  cover_image_url: String(f.get("cover_image_url")),
                  product_image_urls: String(f.get("product_image_urls")).split(/\s+/).filter(Boolean),
                  website_url: String(f.get("website_url")),
                  instagram_handle: String(f.get("instagram_handle")),
                  contact_email: String(f.get("contact_email")),
                  show_past_markets: f.get("show_past_markets") === "on",
                  published: f.get("published") === "on",
                },
              });
              await queryClient.invalidateQueries({ queryKey: ["vendor-profile", userId] });
              setEditing(false);
              setMessage({ ok: true, text: "Public profile saved." });
            } catch (e) {
              setMessage({ ok: false, text: e instanceof Error ? e.message.split("\n")[0]! : "Could not save." });
            } finally {
              setBusy(false);
            }
          }}
        >
          <Field label="Business name" name="business_name" value={p?.business_name ?? businessName} required />
          <Field label="Profile address" name="slug" value={p?.slug ?? slugify(businessName)} required hint="Your page: /v/your-address. Lowercase letters, numbers and hyphens." />
          <Field label="Category" name="category" value={p?.category ?? category} placeholder="Bakery, ceramics, tacos…" />
          <Field label="Service area" name="service_area" value={p?.service_area ?? city} placeholder="Phoenix metro" />
          <div className="sm:col-span-2"><Field label="Tagline" name="tagline" value={p?.tagline} placeholder="One line shoppers will remember" /></div>
          <label className="block text-sm font-medium sm:col-span-2">About<Textarea name="description" defaultValue={p?.description ?? description} className="mt-2" maxLength={2000} /></label>
          <Field label="Logo image link" name="logo_url" type="url" value={p?.logo_url} placeholder="https://…" />
          <Field label="Cover image link" name="cover_image_url" type="url" value={p?.cover_image_url} placeholder="https://…" />
          <label className="block text-sm font-medium sm:col-span-2">
            Product photo links
            <Textarea name="product_image_urls" defaultValue={p?.product_image_urls.join("\n")} className="mt-2" placeholder="One https:// link per line (up to 12)" />
            <span className="mt-1 block text-xs font-normal text-muted-foreground">Only use photos you own or have permission to use.</span>
          </label>
          <Field label="Website" name="website_url" type="url" value={p?.website_url} placeholder="https://…" />
          <Field label="Instagram" name="instagram_handle" value={p?.instagram_handle} placeholder="@yourshop" />
          <Field label="Public contact email" name="contact_email" type="email" value={p?.contact_email} />
          <fieldset className="space-y-3 sm:col-span-2">
            <label className="flex items-center gap-3 text-sm"><input type="checkbox" name="show_past_markets" defaultChecked={p?.show_past_markets ?? true} className="h-4 w-4" />Show past markets on my profile</label>
            <label className="flex items-center gap-3 text-sm"><input type="checkbox" name="published" defaultChecked={p?.published ?? false} className="h-4 w-4" />Publish my profile</label>
          </fieldset>
          <div className="sm:col-span-2">
            <Button disabled={busy}><Check />{busy ? "Saving…" : "Save public profile"}</Button>
            <Button type="button" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
          </div>
        </form>
      )}
      {message && <p role={message.ok ? "status" : "alert"} className={`mt-4 text-sm ${message.ok ? "text-sage" : "text-destructive"}`}>{message.text}</p>}
    </section>
  );
}
