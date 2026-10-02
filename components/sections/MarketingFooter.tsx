import Link from "next/link";
import { PawPrint } from "lucide-react";
import { APP } from "@/lib/config/app";
import { getTranslations } from "next-intl/server";
import { SPECIES_CONFIG } from "@/lib/config/species";

export default async function MarketingFooter() {
  const [t, tPub] = await Promise.all([getTranslations("footer"), getTranslations("public")]);

  const speciesGuideLinks = Object.values(SPECIES_CONFIG)
    .filter((s) => s.id !== "other")
    .map((s) => ({
      label: `${s.emoji} ${tPub(`species_${s.id}` as Parameters<typeof tPub>[0])}`,
      href: `/species/${s.id}`,
    }));

  const LINK_SECTIONS = [
    {
      heading: t("sections.product"),
      links: [
        { label: t("links.features"), href: "/features" },
        { label: t("links.pricing"), href: "/pricing" },
        { label: t("links.shop"), href: "/shop" },
        { label: t("links.findAPro"), href: "/find" },
        { label: t("links.adoptAPet"), href: "/adopt" },
      ],
    },
    {
      heading: t("sections.guides"),
      links: speciesGuideLinks,
    },
    {
      heading: t("sections.professionals"),
      links: [
        { label: t("links.forVetsSitters"), href: "/pros" },
        { label: t("links.joinAsVet"), href: "/register?role=vet" },
        { label: t("links.joinAsSitter"), href: "/register?role=sitter" },
        { label: t("links.joinAsGroomer"), href: "/register?role=groomer" },
      ],
    },
    {
      heading: t("sections.company"),
      links: [
        { label: t("links.about"), href: "/about" },
        { label: t("links.blog"), href: "/blog" },
        { label: t("links.roadmap"), href: "/roadmap" },
        { label: t("links.changelog"), href: "/changelog" },
        { label: t("links.liveDemo"), href: "/demo" },
        { label: t("links.contactUs"), href: `mailto:${APP.email}` },
      ],
    },
    {
      heading: t("sections.legal"),
      links: [
        { label: t("links.privacyPolicy"), href: "/legal/privacy" },
        { label: t("links.termsOfService"), href: "/legal/terms" },
        { label: t("links.cookiePolicy"), href: "/legal/cookies" },
      ],
    },
  ];

  return (
    <footer className="bg-[var(--obsidian-deep)] text-[var(--platinum)] border-t border-[var(--hairline-soft)]">
      <div className="section-inner py-16">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-10 lg:gap-16">
          {/* Brand column */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="inline-flex items-center gap-2 no-underline mb-4">
              <div className="w-8 h-8 rounded-lg bg-[var(--champagne)] flex items-center justify-center">
                <PawPrint className="w-4 h-4 text-[var(--obsidian)]" />
              </div>
              <span className="font-semibold text-[var(--platinum)] text-lg tracking-wide">
                {APP.name}
              </span>
            </Link>
            <p className="text-sm text-[var(--mist-dark)] leading-relaxed mb-5">{APP.tagline}</p>
            <a
              href={`mailto:${APP.email}`}
              className="text-sm text-[var(--mist-dark)] hover:text-[var(--champagne)] transition-colors no-underline"
            >
              {APP.email}
            </a>
          </div>

          {/* Link columns */}
          {LINK_SECTIONS.map(({ heading, links }) => (
            <div key={heading}>
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--champagne-dim)] mb-4">
                {heading}
              </p>
              <ul className="space-y-3">
                {links.map(({ label, href }) => (
                  <li key={label}>
                    <Link
                      href={href}
                      className="text-sm text-[var(--mist-dark)] hover:text-[var(--platinum)] transition-colors no-underline"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="border-t border-[var(--hairline-soft)] mt-12 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-[var(--mist-dark)]">
            © {APP.foundingYear} {APP.name}. {t("bottom.rights")}
          </p>
          <div className="flex items-center gap-6">
            <Link
              href="/legal/privacy"
              className="text-xs text-[var(--mist-dark)] hover:text-[var(--platinum)] no-underline transition-colors"
            >
              {t("bottom.privacy")}
            </Link>
            <Link
              href="/legal/terms"
              className="text-xs text-[var(--mist-dark)] hover:text-[var(--platinum)] no-underline transition-colors"
            >
              {t("bottom.terms")}
            </Link>
            <Link
              href="/legal/cookies"
              className="text-xs text-[var(--mist-dark)] hover:text-[var(--platinum)] no-underline transition-colors"
            >
              {t("bottom.cookies")}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
