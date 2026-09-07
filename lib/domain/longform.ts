import { parseContentBlocks } from "bip-kit";
import type { ContentBlock } from "bip-kit";

/**
 * The blog's long-form pipeline: bip-kit's typed-block parser.
 *
 * Typed blocks are the security model (the same one the retired
 * lib/domain/blog-markup.ts had, with the full vocabulary instead of a
 * three-block subset): markdown becomes a discriminated union and the
 * renderer emits React elements from typed data — there is no raw-HTML
 * passthrough for DB-authored text to hide in.
 *
 * One petvity-specific wrinkle: bip-kit's trust boundary is COMMITTED
 * content, so a malformed `chart`/`stats` fence throws by design ("fail the
 * build"). Our bodies are DB-authored and parsed at request time (and live
 * on every keystroke in the admin preview), so a half-typed fence must never
 * become a 500 or a crashed editor. On a parse error we downgrade those two
 * spec fences to plain code fences and parse again — the author sees their
 * malformed spec as a code block (honest degradation, same in preview and on
 * the public page) instead of an error page.
 */
export function parseLongform(body: string): ContentBlock[] {
  try {
    return parseContentBlocks(body);
  } catch {
    return parseContentBlocks(body.replace(/^```(chart|stats)\s*$/gm, "```"));
  }
}
