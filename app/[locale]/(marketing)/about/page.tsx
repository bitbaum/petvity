import Link from "next/link";
import { Heart, Globe, Shield, Zap, ArrowRight, PawPrint } from "lucide-react";
import { APP } from "@/lib/config/app";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { buildAlternates } from "@/lib/i18n/alternates";

type Params = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "about" });
  const title = t("metaTitle", { app: APP.name });
  const description = t("metaDesc");
  return {
    title,
    description,
    openGraph: { title, description },
    twitter: { card: "summary", title, description },
    alternates: buildAlternates("/about"),
  };
}

const VALUE_META = [
  { icon: Heart, color: "ed-icon", titleKey: "v1Title" as const, descKey: "v1Desc" as const },
  { icon: Globe, color: "ed-icon", titleKey: "v2Title" as const, descKey: "v2Desc" as const },
  { icon: Shield, color: "ed-icon", titleKey: "v3Title" as const, descKey: "v3Desc" as const },
  { icon: Zap, color: "ed-icon", titleKey: "v4Title" as const, descKey: "v4Desc" as const },
] as const;

const STAT_KEYS = [
  { valueKey: "stat1Value" as const, labelKey: "stat1Label" as const },
  { valueKey: "stat2Value" as const, labelKey: "stat2Label" as const },
  { valueKey: "stat3Value" as const, labelKey: "stat3Label" as const },
  { valueKey: "stat4Value" as const, labelKey: "stat4Label" as const },
] as const;

export default async function AboutPage({ params }: Params) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "about" });

  return (
    <div className="min-h-screen bg-[var(--obsidian)] text-[var(--platinum)] overflow-x-hidden">
      {/* Hero */}
      <section className="lux-section relative pt-28 pb-16 md:pt-36 md:pb-24">
        <div className="section-inner relative">
          <div className="max-w-2xl">
            <div className="ed-eyebrow inline-flex items-center gap-2 mb-7">
              <PawPrint className="w-3 h-3" />
              {t("heroEyebrow")}
            </div>
            <h1 className="ed-title mb-6">{t("heroTitle")}</h1>
            <p className="text-lg md:text-xl text-[var(--platinum-dim)] leading-relaxed">
              {t("heroDesc")}
            </p>
          </div>
        </div>
      </section>

      {/* Mission + stats */}
      <section className="py-20 lux-section-raised">
        <div className="section-inner">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <p className="ed-eyebrow mb-4">{t("missionTitle")}</p>
              <p className="text-[var(--mist-dark)] leading-relaxed text-lg">{t("missionBody")}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {STAT_KEYS.map(({ valueKey, labelKey }) => (
                <div key={labelKey} className="lux-card p-7 text-center">
                  <p className="font-display text-4xl font-light text-[var(--champagne)] mb-2">
                    {t(valueKey)}
                  </p>
                  <p className="text-sm text-[var(--mist-dark)]">{t(labelKey)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-20">
        <div className="section-inner">
          <div className="grid sm:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {VALUE_META.map(({ icon: Icon, color, titleKey, descKey }) => (
              <div key={titleKey} className="lux-card p-7 flex gap-5">
                <div
                  className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-[var(--platinum)] mb-2">{t(titleKey)}</h3>
                  <p className="text-sm text-[var(--mist-dark)] leading-relaxed">{t(descKey)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="lux-section-deep relative overflow-hidden py-20">
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.05] pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(circle, var(--champagne) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />
        <div
          aria-hidden
          className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-[var(--champagne)] opacity-[0.06] pointer-events-none"
        />
        <div className="section-inner relative text-center">
          <h2 className="ed-title ed-title-on-dark mb-4">{t("ctaTitle")}</h2>
          <p className="text-[var(--platinum-dim)] opacity-80 text-lg mb-8 max-w-xl mx-auto">
            {t("ctaDesc")}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/register" className="btn-editorial-light">
              {t("ctaButton")}
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/features" className="btn-editorial-light">
              {t("ctaFeatures")}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
