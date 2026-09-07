import { describe, expect, it } from "vitest";
import { parseLongform } from "./longform";

/**
 * The authoring contract the retired lib/domain/blog-markup.ts guaranteed,
 * asserted against the bip-kit pipeline that replaced it: every body written
 * in the old three-block subset (paragraphs, `## ` subheadings, `- ` lists)
 * must keep parsing to the same structure and words — existing DB posts may
 * never change meaning because the renderer improved.
 */
describe("parseLongform — legacy subset compatibility", () => {
  const texts = (body: string) =>
    parseLongform(body).map((b) => {
      if (b.type === "p" || b.type === "h2") return { type: b.type, text: b.text };
      if (b.type === "ul") return { type: b.type, items: b.items };
      return { type: b.type };
    });

  it("parses a paragraph", () => {
    expect(texts("Hello there.")).toEqual([{ type: "p", text: "Hello there." }]);
  });

  it("joins wrapped lines into one paragraph", () => {
    expect(texts("One line\nand its continuation.")).toEqual([
      { type: "p", text: "One line and its continuation." },
    ]);
  });

  it("splits paragraphs on blank lines", () => {
    expect(texts("First.\n\nSecond.")).toEqual([
      { type: "p", text: "First." },
      { type: "p", text: "Second." },
    ]);
  });

  it("parses a subheading", () => {
    expect(texts("## Why it matters")).toEqual([{ type: "h2", text: "Why it matters" }]);
  });

  it("collects consecutive bullets into one list", () => {
    expect(texts("- one\n- two\n- three")).toEqual([
      { type: "ul", items: ["one", "two", "three"] },
    ]);
  });

  it("lets a list interrupt a paragraph without a blank line", () => {
    expect(texts("Intro:\n- a\nOutro.")).toEqual([
      { type: "p", text: "Intro:" },
      { type: "ul", items: ["a"] },
      { type: "p", text: "Outro." },
    ]);
  });

  it("keeps mixed documents in order", () => {
    expect(texts("Opening.\n\n## Section\n\nBody text.\n\n- point\n- point two")).toEqual([
      { type: "p", text: "Opening." },
      { type: "h2", text: "Section" },
      { type: "p", text: "Body text." },
      { type: "ul", items: ["point", "point two"] },
    ]);
  });

  it("never lets text become markup (no raw-HTML passthrough)", () => {
    expect(texts("<script>alert(1)</script>")).toEqual([
      { type: "p", text: "<script>alert(1)</script>" },
    ]);
  });

  it("handles CRLF bodies", () => {
    expect(texts("A.\r\n\r\nB.")).toEqual([
      { type: "p", text: "A." },
      { type: "p", text: "B." },
    ]);
  });
});

describe("parseLongform — DB-authored safety", () => {
  it("degrades a malformed chart fence to a code block instead of throwing", () => {
    // bip-kit throws on malformed chart specs (committed-content trust
    // boundary); our bodies are DB-authored and parsed live, so this must
    // degrade, never 500 the post page or crash the editor preview.
    const blocks = parseLongform("Before.\n\n```chart\nnot a spec\n```\n\nAfter.");
    expect(blocks.map((b) => b.type)).toEqual(["p", "code", "p"]);
  });

  it("degrades a malformed stats fence to a code block instead of throwing", () => {
    const blocks = parseLongform("```stats\nno separator here\n```");
    expect(blocks.map((b) => b.type)).toEqual(["code"]);
  });
});
