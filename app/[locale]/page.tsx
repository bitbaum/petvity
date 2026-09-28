import { Activity, CheckCircle, Heart, Stethoscope, ArrowRight } from "lucide-react";
import Link from "next/link";
import MarketingNav from "@/components/sections/MarketingNav";
import MarketingFooter from "@/components/sections/MarketingFooter";
import { HeroCTA } from "@/components/sections/HeroCTA";
import type { Metadata } from "next";
import { APP, APP_URL } from "@/lib/config/app";
import { getTranslations } from "next-intl/server";
import { buildAlternates } from "@/lib/i18n/alternates";

type Params = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "home" });
  const title = t("metaTitle", { app: APP.name });
  const description = t("metaDesc");
  return {
    title,
    description,
    openGraph: { title, description, type: "website" },
    alternates: buildAlternates(""),
  };
}

/** Mobile-first homepage: a visitor should read one line and act. Every
 *  section here earns its place by answering "what is it / why me / is it
 *  free" in a glance — longer explanations live on /features and /pricing. */
export default async function HomePage({ params }: Params) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "home" });

  const heroMetrics = [
    { label: t("mockWeight"), value: "32.4 kg", sub: t("mockStable") },
    { label: t("mockHeart"), value: "72 bpm", sub: t("mockNormal") },
    { label: t("mockMood"), value: "5 / 5", sub: t("mockGreat") },
  ];

  const benefits = [
    { icon: Activity, title: t("benefitTrackTitle"), desc: t("benefitTrackDesc") },
    { icon: Stethoscope, title: t("benefitCareTitle"), desc: t("benefitCareDesc") },
    { icon: Heart, title: t("benefitAdoptTitle"), desc: t("benefitAdoptDesc") },
  ];

  const freeItems = [t("trustUnlimitedPets"), t("trustNoCreditCard"), t("trustCancelAnytime")];

  const orgSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: APP.name,
    url: APP_URL,
    description: APP.tagline,
    foundingDate: String(APP.foundingYear),
    contactPoint: { "@type": "ContactPoint", email: APP.email, contactType: "customer support" },
  };

  const siteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: APP.name,
    url: APP_URL,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${APP_URL}/${locale}/adopt?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <div className="min-h-screen bg-[var(--obsidian)] text-[var(--platinum)] overflow-x-hidden">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(orgSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(siteSchema) }}
      />
      <MarketingNav />

      <main>
        {/* ── Hero: one line, one CTA ──────────────────────────────────────── */}
        <section className="lux-hero relative pt-24 pb-14 md:pt-36 md:pb-24">
          <div className="section-inner relative">
            <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
              <div className="min-w-0">
                <div className="eyebrow-editorial lux-rise mb-5">{t("heroBadge")}</div>

                <h1 className="display-title lux-rise lux-rise-2 text-[2.5rem] sm:text-[3.4rem] md:text-[4.5rem] mb-5">
                  {t("heroTitle1")}
                  <br />
                  <em>{t("heroTitle2")}</em>
                </h1>

                <p className="text-lg text-[var(--platinum-dim)] leading-snug mb-7 max-w-md lux-rise lux-rise-3">
                  {t("heroSub")}
                </p>

                <HeroCTA />
              </div>

              {/* One glanceable mock: what a check-in looks like */}
              <div className="relative lux-rise lux-rise-4 min-w-0">
                <div className="card relative shadow-[var(--shadow-lg)] rounded-2xl overflow-hidden max-w-md mx-auto">
                  <div className="bg-[var(--warm-dark)] px-5 py-3.5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-xl flex-shrink-0">
                        🐕
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-white text-sm">Buddy</p>
                        <p className="text-white/60 text-xs truncate">Golden Retriever · 3 yr</p>
                      </div>
                    </div>
                    <span className="bg-[var(--green-bg)] text-[var(--green-text)] text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1 flex-shrink-0">
                      <CheckCircle className="w-3 h-3" /> {t("mockHealthy")}
                    </span>
                  </div>
                  <div className="p-4 grid grid-cols-3 gap-2.5">
                    {heroMetrics.map(({ label, value, sub }) => (
                      <div
                        key={label}
                        className="bg-[var(--off)] rounded-xl p-2.5 text-center min-w-0"
                      >
                        <p className="text-[10px] text-[var(--muted)] mb-1 uppercase tracking-wide truncate">
                          {label}
                        </p>
                        <p className="text-sm font-bold text-[var(--ink)]">{value}</p>
                        <p className="text-[10px] text-[var(--green-text)] mt-0.5 truncate">
                          {sub}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Three benefits, one line each ────────────────────────────────── */}
        <section id="features" className="py-14 md:py-20 border-t border-[var(--hairline-soft)]">
          <div className="section-inner">
            <h2 className="sr-only">{t("featuresTitle")}</h2>
            <ul className="grid md:grid-cols-3 gap-3 md:gap-6">
              {benefits.map(({ icon: Icon, title, desc }) => (
                <li key={title} className="lux-card p-5 flex items-center gap-4 min-w-0">
                  <div className="ed-icon w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base font-semibold text-[var(--platinum)]">{title}</h3>
                    <p className="text-sm text-[var(--mist-dark)]">{desc}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ── Free + final CTA ─────────────────────────────────────────────── */}
        <section id="pricing" className="lux-section-raised py-16 md:py-24">
          <div className="section-inner text-center">
            <h2 className="ed-title mb-5">{t("pricingTitle")}</h2>
            <ul className="flex flex-wrap justify-center gap-x-5 gap-y-2 mb-8">
              {freeItems.map((item) => (
                <li
                  key={item}
                  className="inline-flex items-center gap-1.5 text-sm text-[var(--platinum-dim)]"
                >
                  <CheckCircle className="w-4 h-4 text-[var(--champagne)] flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
            <Link href="/register" className="btn-editorial btn-editorial-wrap justify-center">
              {t("finalCta")}
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>
      </main>
      <MarketingFooter />
    </div>
  );
}
