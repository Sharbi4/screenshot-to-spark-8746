import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const slugInput = z.object({ slug: z.string().trim().toLowerCase().min(1).max(80).regex(/^[a-z0-9-]+$/) });

export const getMarketProfile = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => slugInput.parse(input))
  .handler(async ({ data }) => {
    const { loadMarketProfile } = await import("./directory.server");
    return loadMarketProfile(data.slug);
  });

export const getVendorProfile = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => slugInput.parse(input))
  .handler(async ({ data }) => {
    const { loadVendorProfile } = await import("./directory.server");
    return loadVendorProfile(data.slug);
  });
