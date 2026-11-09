// Only same-site paths are accepted as post-sign-in destinations (blocks open redirects).
export const safeRedirect = (value: unknown) => (typeof value === "string" && /^\/(?![/\\])[\w\-/.]*$/.test(value) ? value : undefined);
