import { z } from "zod";

export const directoryKinds = ["farmers", "night", "flea", "artisan", "craft", "festival", "popup", "food_truck", "community", "public", "holiday"] as const;
export const weekdays = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
export type Weekday = (typeof weekdays)[number];

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD.");
const time = z.string().regex(/^([01]\d|2[0-4]):[0-5]\d$/, "Use 24h HH:MM.").nullable().optional();
const url = z.string().regex(/^https?:\/\/\S+$/, "Use a full http(s) URL.");

export const scheduleRuleSchema = z.object({
  label: z.string().max(60).default("Market"),
  days: z.array(z.enum(weekdays)).min(1),
  opens: time,
  closes: time,
  starts_on: isoDate.optional(),
  ends_on: isoDate.optional(),
  note: z.string().max(240).optional(),
});
export type ScheduleRule = z.infer<typeof scheduleRuleSchema>;

export const directoryRecordSchema = z.object({
  external_id: z.string().regex(/^us-[a-z]{2}-[a-z0-9-]+$/, "external_id must look like us-xx-city-name."),
  name: z.string().trim().min(2).max(150),
  kind: z.enum(directoryKinds),
  description: z.string().trim().max(600).default(""),
  organizer_name: z.string().trim().max(150).default(""),
  website_url: url.nullable(),
  contact_email: z.string().trim().email().or(z.literal("")).default(""),
  contact_phone: z.string().trim().max(40).default(""),
  social_links: z.record(z.enum(["facebook", "instagram", "tiktok", "x", "youtube"]), url).default({}),
  venue_name: z.string().trim().max(150).default(""),
  address: z.string().trim().max(200).default(""),
  city: z.string().trim().min(1).max(100),
  state: z.string().regex(/^[A-Z]{2}$/),
  postal_code: z.string().regex(/^(\d{5}(-\d{4})?)?$/).default(""),
  time_zone: z.string().regex(/^America\/|^Pacific\//),
  latitude: z.number().min(-90).max(90).nullable().default(null),
  longitude: z.number().min(-180).max(180).nullable().default(null),
  schedule_rules: z.array(scheduleRuleSchema).default([]),
  season_note: z.string().max(300).default(""),
  upcoming_dates: z.array(isoDate).default([]),
  vendor_applications: z.enum(["open", "closed", "unknown"]).default("unknown"),
  vendor_application_url: url.nullable().default(null),
  vendor_types: z.array(z.string().max(60)).default([]),
  vendor_requirements: z.string().max(1000).default(""),
  booth_price_note: z.string().max(300).default(""),
  amenities: z.array(z.enum(["power", "water", "corner", "shade", "wifi", "parking"])).default([]),
  photo: z.object({ status: z.enum(["none", "licensed"]), note: z.string().optional() }).default({ status: "none" }),
  sources: z
    .array(
      z.object({
        source_type: z.enum(["official_website", "usda_directory", "state_directory", "municipal", "tourism", "association", "organizer_calendar", "organizer", "other_licensed"]),
        url,
        fields: z.array(z.string()).default([]),
        retrieved_on: isoDate,
        notes: z.string().default(""),
      }),
    )
    .min(1, "Every record needs at least one source."),
  verification: z.object({
    status: z.enum(["verified", "needs_review"]),
    confidence: z.enum(["high", "medium", "low"]),
    notes: z.array(z.string()).default([]),
  }),
});
export type DirectoryRecord = z.infer<typeof directoryRecordSchema>;
