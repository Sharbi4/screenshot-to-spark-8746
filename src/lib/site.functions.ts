import { createServerFn } from "@tanstack/react-start";

/** Canonical origin: PUBLIC_SITE_URL when configured (production domain), otherwise the request origin. */
export const getSiteOrigin = createServerFn({ method: "GET" }).handler(async () => {
  const configured = process.env["PUBLIC_SITE_URL"]?.replace(/\/+$/, "");
  if (configured && /^https:\/\//.test(configured)) return configured;
  const { getRequest } = await import("@tanstack/react-start/server");
  try {
    return new URL(getRequest().url).origin;
  } catch {
    return "";
  }
});
