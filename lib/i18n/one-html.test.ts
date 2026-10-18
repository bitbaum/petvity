import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * One <html>, rendered by the root layout. A second one in app/[locale]
 * lost the page's language and fonts on every client navigation into the
 * portal (components/i18n/DocumentLanguage.tsx) — and nothing failed.
 */
const layouts = (dir: string): string[] =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) return layouts(p);
    return /^layout\.tsx$/.test(f) ? [p] : [];
  });

describe("the document element", () => {
  it("is rendered by the root layout only", () => {
    const withHtml = layouts("app").filter((f) => /<html[\s>]/.test(readFileSync(f, "utf8")));
    expect(withHtml).toEqual([join("app", "layout.tsx")]);
  });

  it("is told its language by every route group", () => {
    for (const group of [
      "app/[locale]/layout.tsx",
      "app/(portal)/layout.tsx",
      "app/(auth)/layout.tsx",
      "app/(admin)/admin/layout.tsx",
    ])
      expect(readFileSync(group, "utf8"), group).toMatch(/<DocumentLanguage locale=/);
  });
});
