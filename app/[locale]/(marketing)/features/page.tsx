import Link from "next/link";
import {
  Activity,
  FileText,
  Globe,
  Zap,
  Heart,
  BarChart3,
  Bell,
  Shield,
  Smartphone,
  Settings,
  ArrowRight,
  CheckCircle,
  Brain,
  Search,
  ShoppingBag,
  Lock,
} from "lucide-react";
import type { Metadata } from "next";
import { APP, APP_URL } from "@/lib/config/app";
import { getTranslations } from "next-intl/server";
import { buildAlternates } from "@/lib/i18n/alternates";

type Params = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "features" });
  const title = t("metaTitle", { app: APP.name });
  const description = t("metaDesc");
  return {
    title,
    description,
    openGraph: { title, description },
    twitter: { card: "summary", title, description },
    alternates: buildAlternates("/features"),
  };
}

/** The host a public pet profile is shared on. */
const PUBLIC_HOST = new URL(APP_URL).host;

const PILLAR_META = [
  {
    icon: Activity,
    titleKey: "fp1Title" as const,
    descKey: "fp1Desc" as const,
    bulletKeys: ["fp1B1", "fp1B2", "fp1B3", "fp1B4"] as const,
  },
  {
    icon: Brain,
    titleKey: "fp2Title" as const,
    descKey: "fp2Desc" as const,
    bulletKeys: ["fp2B1", "fp2B2", "fp2B3", "fp2B4"] as const,
  },
  {
    icon: Zap,
    titleKey: "fp3Title" as const,
    descKey: "fp3Desc" as const,
    bulletKeys: ["fp3B1", "fp3B2", "fp3B3"] as const,
  },
  {
    icon: FileText,
    titleKey: "fp4Title" as const,
    descKey: "fp4Desc" as const,
    bulletKeys: ["fp4B1", "fp4B2", "fp4B3", "fp4B4"] as const,
  },
  {
    icon: Globe,
    titleKey: "fp5Title" as const,
    descKey: "fp5Desc" as const,
    bulletKeys: ["fp5B1", "fp5B2", "fp5B3", "fp5B4"] as const,
  },
  {
    icon: Search,
    titleKey: "fp6Title" as const,
    descKey: "fp6Desc" as const,
    bulletKeys: ["fp6B1", "fp6B2", "fp6B3", "fp6B4"] as const,
  },
  {
    icon: ShoppingBag,
    titleKey: "fp7Title" as const,
    descKey: "fp7Desc" as const,
    bulletKeys: ["fp7B1", "fp7B2", "fp7B3", "fp7B4"] as const,
  },
  {
    icon: Heart,
    titleKey: "fp8Title" as const,
    descKey: "fp8Desc" as const,
    bulletKeys: ["fp8B1", "fp8B2", "fp8B3", "fp8B4"] as const,
  },
  {
    icon: Globe,
    titleKey: "fp9Title" as const,
    descKey: "fp9Desc" as const,
    bulletKeys: ["fp9B1", "fp9B2", "fp9B3", "fp9B4"] as const,
  },
  {
    icon: Shield,
    titleKey: "fp10Title" as const,
    descKey: "fp10Desc" as const,
    bulletKeys: ["fp10B1", "fp10B2", "fp10B3", "fp10B4"] as const,
  },
] as const;

const CC_META = [
  { icon: Smartphone, labelKey: "cc1Label" as const, descKey: "cc1Desc" as const },
  { icon: Bell, labelKey: "cc2Label" as const, descKey: "cc2Desc" as const },
  { icon: Lock, labelKey: "cc3Label" as const, descKey: "cc3Desc" as const },
  { icon: BarChart3, labelKey: "cc4Label" as const, descKey: "cc4Desc" as const },
  { icon: Settings, labelKey: "cc5Label" as const, descKey: "cc5Desc" as const },
  { icon: Globe, labelKey: "cc6Label" as const, descKey: "cc6Desc" as const },
] as const;

export default async function FeaturesPage({ params }: Params) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "features" });

  return (
    <div className="min-h-screen bg-[var(--obsidian)] text-[var(--platinum)] overflow-x-hidden">
      {/* Hero */}
      <section className="lux-section relative pt-28 pb-16 md:pt-36 md:pb-24">
        <div className="section-inner relative text-center max-w-3xl mx-auto">
          <p className="ed-eyebrow mb-7">{t("heroEyebrow")}</p>
          <h1 className="ed-title mb-6">{t("heroTitle")}</h1>
          <p className="text-lg md:text-xl text-[var(--mist-dark)] leading-relaxed mb-10">
            {t("heroDesc")}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/register" className="btn-editorial justify-center">
              {t("ctaButton")}
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/pricing" className="btn-editorial-ghost justify-center">
              {t("ctaPricing")}
            </Link>
          </div>
        </div>
      </section>

      {/* Feature pillars */}
      <section id="features" className="py-20 lux-section-raised">
        <div className="section-inner">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {PILLAR_META.map(({ icon: Icon, titleKey, descKey, bulletKeys }) => (
              <div key={titleKey} className="lux-card p-7 flex flex-col gap-5">
                <div className="ed-icon w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[var(--platinum)] mb-2">{t(titleKey)}</h2>
                  <p className="text-sm text-[var(--mist-dark)] leading-relaxed mb-4">
                    {t(descKey, { app: APP.name })}
                  </p>
                  <ul className="space-y-2">
                    {bulletKeys.map((bk) => (
                      <li
                        key={bk}
                        className="flex items-start gap-2 text-sm text-[var(--platinum-dim)]"
                      >
                        <CheckCircle className="w-4 h-4 text-[var(--champagne)] flex-shrink-0 mt-0.5" />
                        {t(bk, { host: PUBLIC_HOST })}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Cross-cutting capabilities */}
      <section className="py-20">
        <div className="section-inner">
          <div className="text-center mb-12">
            <h2 className="ed-title mb-4">{t("ccTitle")}</h2>
            <p className="text-lg text-[var(--mist-dark)] max-w-xl mx-auto">{t("ccDesc")}</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {CC_META.map(({ icon: Icon, labelKey, descKey }) => (
              <div
                key={labelKey}
                className="flex items-start gap-4 p-5 rounded-2xl bg-white/[0.04] border border-[var(--hairline-soft)]"
              >
                <div className="ed-icon w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-semibold text-[var(--platinum)] text-sm mb-1">{t(labelKey)}</p>
                  <p className="text-sm text-[var(--mist-dark)]">{t(descKey)}</p>
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
        <div
          aria-hidden
          className="absolute -bottom-16 -left-16 w-64 h-64 rounded-full bg-[var(--champagne)] opacity-[0.06] pointer-events-none"
        />

        <div className="section-inner relative text-center">
          <h2 className="ed-title ed-title-on-dark mb-4">{t("ctaTitle")}</h2>
          <p className="text-[var(--platinum-dim)] opacity-80 text-lg mb-8 max-w-xl mx-auto">
            {t("ctaDesc")}
          </p>
          <Link href="/register" className="btn-editorial-light">
            {t("ctaButton")}
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
