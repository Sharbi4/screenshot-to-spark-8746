import { z } from "zod";

export const profileSchema = z.object({
  display_name: z.string().trim().min(1).max(100), business_name: z.string().trim().min(1).max(150),
  participation: z.enum(["vendor", "organizer", "both"]), category: z.string().max(100),
  city: z.string().trim().min(1).max(100), phone: z.string().max(40), description: z.string().max(2000),
});
export const marketSchema = z.object({
  name: z.string().trim().min(1).max(150), city: z.string().trim().min(1).max(100),
  address: z.string().trim().min(1).max(300), schedule: z.string().trim().min(1).max(100),
  hours: z.string().trim().min(1).max(100), description: z.string().max(2000),
});
export const stallSchema = z.object({
  id: z.string().uuid().optional(), market_id: z.string().uuid(), label: z.string().trim().min(1).max(100),
  width_ft: z.coerce.number().positive().max(1000), depth_ft: z.coerce.number().positive().max(1000),
  daily_price: z.coerce.number().min(0).max(100000), availability: z.enum(["available", "reserved", "unavailable"]),
  amenities: z.array(z.enum(["power", "water", "corner", "shade", "wifi", "parking"])), notes: z.string().max(2000),
});