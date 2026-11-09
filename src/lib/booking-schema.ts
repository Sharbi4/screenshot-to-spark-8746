import { z } from "zod";

export const bookingRequestSchema = z.object({
  request_key: z.string().uuid(),
  market_id: z.string().min(1).max(80).optional(),
  stall_id: z.string().uuid().optional(),
  booking_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
    const date = new Date(`${value}T12:00:00Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }, "Choose a valid date."),
  notes: z.string().trim().max(2000).default(""),
}).refine((value) => Boolean(value.market_id) !== Boolean(value.stall_id), "Choose one market or stall.");