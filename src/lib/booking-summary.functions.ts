import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// The current dashboard contains public demo bookings only. Accept an ID, never
// arbitrary prompt content; private bookings will require user-scoped auth.
export const getBookingSummary = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ marketId: z.string().min(1).max(80) }).parse(input))
  .handler(async ({ data }) => {
    const { summarizeBooking } = await import("./booking-summary.server");
    return summarizeBooking(data.marketId);
  });