/**
 * The data path from the fleet map to what the page renders, with no network:
 * the same projection the page uses (`developmentProfileFromMap`) is run on a
 * fixture shaped like `https://loki.orangecat.ch/api/fleet/map`, so a change
 * in what the map emits — or in what bip-kit accepts — fails here first.
 */
import { describe, it, expect, vi } from "vitest";
import { developmentProfileFromMap, loadDevelopmentProfile } from "bip-kit";
import { DEVELOPMENT } from "@/lib/config/development";

const FIXTURE = {
  generatedAt: "2026-09-28T10:00:00Z",
  projects: [
    {
      slug: "loki",
      name: "Loki",
      what: "Fleet command",
      roadmap: [],
      changelog: [],
    },
    {
      slug: "petvity",
      name: "Petvity",
      what: "Pet wellness in one place.",
      secret: "must not leak",
      roadmap: [
        {
          title: "Building in public",
          status: "in progress",
          progress: 67,
          targetDate: null,
          milestones: [
            { title: "ROADMAP.md and CHANGELOG.md at the repository root", done: true },
            { title: "/roadmap and /changelog pages read the fleet map", done: true },
            { title: "The fleet map ingests these files", done: false },
          ],
          source: "https://github.com/bitbaum/petvity/blob/main/ROADMAP.md",
        },
        {
          title: "Health tracking",
          status: "done",
          progress: 140,
          targetDate: "2026-Q3",
          milestones: ["Seven daily metrics"],
        },
      ],
      changelog: [
        {
          date: "2026-09-28",
          done: "The homepage is short and mobile-first: one headline, one call to action, three benefits.",
        },
      ],
    },
  ],
};

describe("developmentProfileFromMap on a fleet-map fixture", () => {
  const profile = developmentProfileFromMap(FIXTURE, DEVELOPMENT.slug);

  it("selects this product and projects only the public fields", () => {
    expect(profile).not.toBeNull();
    expect(profile?.slug).toBe("petvity");
    expect(profile?.name).toBe("Petvity");
    expect(profile?.what).toBe("Pet wellness in one place.");
    expect(profile).not.toHaveProperty("secret");
  });

  it("keeps milestones, status, target and source of every roadmap item", () => {
    expect(profile?.roadmap).toHaveLength(2);
    const [now, shipped] = profile!.roadmap;
    expect(now.status).toBe("in progress");
    expect(now.progress).toBe(67);
    expect(now.milestones).toEqual([
      { title: "ROADMAP.md and CHANGELOG.md at the repository root", done: true },
      { title: "/roadmap and /changelog pages read the fleet map", done: true },
      { title: "The fleet map ingests these files", done: false },
    ]);
    expect(now.source).toBe("https://github.com/bitbaum/petvity/blob/main/ROADMAP.md");
    expect(shipped.targetDate).toBe("2026-Q3");
    expect(shipped.milestones).toEqual(["Seven daily metrics"]);
  });

  it("clamps progress into 0–100", () => {
    expect(profile?.roadmap[1].progress).toBe(100);
  });

  it("carries changelog entries as date + done text", () => {
    expect(profile?.changelog).toEqual([
      {
        date: "2026-09-28",
        done: "The homepage is short and mobile-first: one headline, one call to action, three benefits.",
      },
    ]);
  });

  it("is null for a slug the map does not carry", () => {
    expect(developmentProfileFromMap(FIXTURE, "not-a-product")).toBeNull();
  });

  it("is null for a map that is not a map", () => {
    expect(developmentProfileFromMap({ projects: "nope" }, DEVELOPMENT.slug)).toBeNull();
    expect(developmentProfileFromMap(null, DEVELOPMENT.slug)).toBeNull();
  });
});

describe("loadDevelopmentProfile through an injected fetcher", () => {
  it("passes the map URL to the fetcher and projects its JSON", async () => {
    const fetcher = vi.fn<typeof fetch>(
      async () => new Response(JSON.stringify(FIXTURE), { status: 200 }),
    );
    const profile = await loadDevelopmentProfile(DEVELOPMENT.mapUrl, DEVELOPMENT.slug, fetcher);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher).toHaveBeenCalledWith(DEVELOPMENT.mapUrl, expect.anything());
    expect(profile?.name).toBe("Petvity");
  });

  it("is null, not a throw, when the producer is down", async () => {
    const down = vi.fn(async () => new Response("", { status: 503 }));
    await expect(
      loadDevelopmentProfile(DEVELOPMENT.mapUrl, DEVELOPMENT.slug, down as unknown as typeof fetch),
    ).resolves.toBeNull();
    const throws = vi.fn(async () => {
      throw new Error("ECONNREFUSED");
    });
    await expect(
      loadDevelopmentProfile(
        DEVELOPMENT.mapUrl,
        DEVELOPMENT.slug,
        throws as unknown as typeof fetch,
      ),
    ).resolves.toBeNull();
  });
});
