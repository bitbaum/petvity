/**
 * Public development records — SSOT for where they come from.
 *
 * The fleet map is the producer: it ingests ROADMAP.md and CHANGELOG.md from
 * this repository (the record) and serves every product's roadmap/changelog
 * from one endpoint. The site is only a consumer; it keeps no local copy.
 */
export const DEVELOPMENT = {
  /** Loki's fleet map — `{ projects: [{ slug, roadmap, changelog, ... }] }`. */
  mapUrl: "https://loki.orangecat.ch/api/fleet/map",
  /** This product's slug in that map. */
  slug: "petvity",
  /** The full public profile, linked from both pages. */
  profileUrl: "https://loki.orangecat.ch/fleet/petvity",
  /** The map is cached five minutes upstream; re-fetch on the same rhythm. */
  revalidateSeconds: 300,
  /** Records are optional chrome, never a reason to hang a page. */
  timeoutMs: 8_000,
} as const;
