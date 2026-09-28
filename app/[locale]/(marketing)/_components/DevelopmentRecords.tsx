import { DevelopmentPage } from "bip-kit/react";
import "bip-kit/styles.css";
import "@/app/longform.css";
import { DEVELOPMENT } from "@/lib/config/development";
import { loadPetvityProfile } from "@/lib/development/records";

/**
 * The roadmap and changelog pages differ only in `section`; everything else —
 * the fetch, the chrome, the theme scope — is this one component.
 *
 * The records themselves are English-only by the fleet's record contract; the
 * nav, footer and metadata around them stay localized.
 */
export default async function DevelopmentRecords({
  locale,
  section,
}: {
  locale: string;
  section: "roadmap" | "changelog";
}) {
  const profile = await loadPetvityProfile();

  return (
    <div className="lux-section min-h-screen pt-28 pb-24">
      <div className="section-inner pv-longform">
        <DevelopmentPage
          profile={profile}
          section={section}
          homeHref={`/${locale}`}
          roadmapHref={`/${locale}/roadmap`}
          changelogHref={`/${locale}/changelog`}
          profileHref={DEVELOPMENT.profileUrl}
        />
      </div>
    </div>
  );
}
