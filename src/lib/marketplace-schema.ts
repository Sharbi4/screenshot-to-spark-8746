import { z } from "zod";

export const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "Use at least 3 characters.")
  .max(80)
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Use lowercase letters, numbers, and single hyphens.");

export function slugify(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
}

export const marketKinds = ["farmers", "night", "flea", "artisan", "craft", "festival", "popup", "food_truck", "community", "public", "holiday"] as const;
export type MarketKind = (typeof marketKinds)[number];

export const marketKindLabel: Record<MarketKind, string> = {
  farmers: "Farmer's market",
  night: "Night market",
  flea: "Flea market",
  artisan: "Makers fair",
  craft: "Craft market",
  festival: "Festival",
  popup: "Pop-up market",
  food_truck: "Food truck market",
  community: "Community market",
  public: "Public market",
  holiday: "Holiday market",
};

const httpsUrl = z
  .string()
  .trim()
  .max(500)
  .regex(/^https:\/\/\S+$/, "Use a secure https:// link.")
  .or(z.literal(""))
  .transform((value) => value || null);

const webUrl = z
  .string()
  .trim()
  .max(500)
  .regex(/^https?:\/\/\S+$/, "Use a full web address starting with http.")
  .or(z.literal(""))
  .transform((value) => value || null);

export const vendorProfileSchema = z.object({
  slug: slugSchema,
  business_name: z.string().trim().min(1).max(150),
  category: z.string().trim().max(100).default(""),
  tagline: z.string().trim().max(160).default(""),
  description: z.string().trim().max(2000).default(""),
  service_area: z.string().trim().max(150).default(""),
  logo_url: httpsUrl,
  cover_image_url: httpsUrl,
  product_image_urls: z.array(z.string().trim().regex(/^https:\/\/\S+$/, "Use secure https:// image links.")).max(12).default([]),
  website_url: webUrl,
  instagram_handle: z
    .string()
    .trim()
    .max(31)
    .transform((value) => value.replace(/^@/, ""))
    .refine((value) => value === "" || /^[A-Za-z0-9._]{1,30}$/.test(value), "Enter a valid Instagram handle."),
  contact_email: z.string().trim().max(200).email("Enter a valid email.").or(z.literal("")),
  show_past_markets: z.boolean().default(true),
  published: z.boolean().default(false),
});
export type VendorProfileInput = z.input<typeof vendorProfileSchema>;

export const marketClaimSchema = z.object({
  market_id: z.string().uuid(),
  full_name: z.string().trim().min(1).max(120),
  role_title: z.string().trim().min(1).max(120),
  work_email: z.string().trim().max(200).email("Enter a valid email."),
  phone: z.string().trim().max(40).default(""),
  evidence: z.string().trim().max(2000).default(""),
  attest: z.literal(true, { errorMap: () => ({ message: "Please confirm you are authorized to manage this market." }) }),
});

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const date = new Date(`${value}T12:00:00Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }, "Choose a valid date.");

export const appearanceSchema = z.object({
  market_id: z.string().uuid(),
  vendor_slug: slugSchema,
  appearance_date: isoDate,
  booth_label: z.string().trim().max(40).default(""),
  featured: z.boolean().default(false),
});
