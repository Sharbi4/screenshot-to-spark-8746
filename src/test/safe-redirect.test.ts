import { describe, expect, it } from "vitest";
import { safeRedirect } from "@/lib/safe-redirect";

describe("safeRedirect", () => {
  it("allows same-site paths", () => expect(safeRedirect("/manage/sunset-market")).toBe("/manage/sunset-market"));
  it.each(["//evil.com", "/\\evil.com", "https://evil.com", "javascript:alert(1)", "", 42])("rejects %s", (v) => expect(safeRedirect(v)).toBeUndefined());
});
