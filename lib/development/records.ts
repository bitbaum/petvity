import { loadDevelopmentProfile } from "bip-kit";
import type { DevelopmentProfile } from "bip-kit";
import { DEVELOPMENT } from "@/lib/config/development";

/**
 * Next's fetch cache is keyed on the request, so the revalidate window is set
 * here rather than in bip-kit's default (which asks for `no-store`): the map is
 * public, identical for every visitor, and cached upstream for five minutes.
 *
 * The 8s ceiling is bip-kit's own; it is restated so a slower upstream cannot
 * hold a marketing page hostage even if the library's default ever changes.
 */
export const fetchFleetMap: typeof fetch = (input, init) =>
  fetch(input, {
    ...init,
    cache: undefined,
    next: { revalidate: DEVELOPMENT.revalidateSeconds },
    signal: AbortSignal.timeout(DEVELOPMENT.timeoutMs),
  });

/** `null` when the map is unreachable or has no valid entry for this product. */
export function loadPetvityProfile(): Promise<DevelopmentProfile | null> {
  return loadDevelopmentProfile(DEVELOPMENT.mapUrl, DEVELOPMENT.slug, fetchFleetMap);
}
