import Link from "next/link";
import {
  Stethoscope,
  Heart,
  CheckCircle,
  ArrowRight,
  Star,
  CalendarDays,
  Shield,
  Zap,
} from "lucide-react";
import type { Metadata } from "next";
import { APP } from "@/lib/config/app";
import { getTranslations } from "next-intl/server";
import { buildAlternates } from "@/lib/i18n/alternates";

type Params = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "pros" });
  const title = t("metaTitle", { app: APP.name });
  const description = t("metaDesc");
  return {
    title,
    description,
    openGraph: { title, description },
    twitter: { card: "summary", title, description },
    alternates: buildAlternates("/pros"),
  };
}

const VET_BENEFIT_ICONS = [Shield, Star, CalendarDays] as const;
const SITTER_BENEFIT_ICONS = [Shield, Star, CalendarDays, Zap] as const;

const VET_BENEFIT_KEYS = ["vb3", "vb4", "vb5"] as const;
const SITTER_BENEFIT_KEYS = ["sb3", "sb4", "sb5", "sb6"] as const;

const VET_STEP_KEYS = ["vs1", "vs2", "vs3"] as const;
const SITTER_STEP_KEYS = ["ss1", "ss2", "ss3"] as const;

export default async function ProsPage({ params }: Params) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "pros" });

  return (
    <div className="min-h-screen bg-[var(--obsidian)] text-[var(--platinum)] overflow-x-hidden">
      {/* Hero */}
      <section className="lux-section relative pt-28 pb-20 md:pt-36 md:pb-28">
        <div className="section-inner relative">
          <div className="max-w-3xl">
            <div className="eyebrow-editorial mb-7">
              <Stethoscope className="w-3 h-3" />
              {t("heroEyebrow")}
            </div>

            <h1 className="ed-title mb-6">{t("heroTitle")}</h1>

            <p className="text-lg md:text-xl text-[var(--mist-dark)] leading-relaxed mb-9 max-w-2xl">
              {t("heroDesc")}
            </p>

            <div className="flex flex-col sm:flex-row gap-3 mb-10">
              <Link href="/register?role=vet" className="btn-editorial justify-center">
                <Stethoscope className="w-4 h-4" />
                {t("ctaVetButton")}
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href="/register?role=sitter" className="btn-editorial-ghost justify-center">
                <Heart className="w-4 h-4" />
                {t("ctaSitterButton")}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Vet benefits */}
      <section id="veterinarians" className="py-24 md:py-32 lux-section-raised">
        <div className="section-inner">
          <div className="text-center mb-16">
            <div className="ed-icon w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5">
              <Stethoscope className="w-7 h-7" />
            </div>
            <p className="ed-eyebrow mb-3">{t("vetTabLabel")}</p>
            <h2 className="ed-title mb-5">{t("vetHeroTitle")}</h2>
            <p className="text-lg text-[var(--mist-dark)] max-w-xl mx-auto leading-relaxed">
              {t("vetHeroDesc")}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-12 max-w-5xl mx-auto">
            {VET_BENEFIT_KEYS.map((key, i) => {
              const Icon = VET_BENEFIT_ICONS[i];
              return (
                <div key={key} className="lux-card p-7">
                  <div className="ed-icon w-10 h-10 rounded-xl flex items-center justify-center mb-4">
                    <Icon className="w-5 h-5" />
                  </div>
                  <p className="text-sm text-[var(--mist-dark)] leading-relaxed">{t(key)}</p>
                </div>
              );
            })}
          </div>

          {/* How it works */}
          <div className="lux-card p-8">
            <h3 className="ed-title-sm mb-8 text-center">{t("vetHowTitle")}</h3>
            <div className="grid md:grid-cols-3 gap-8">
              {VET_STEP_KEYS.map((key, i) => (
                <div key={key} className="text-center relative">
                  {i < 2 && (
                    <div
                      aria-hidden
                      className="hidden md:block absolute top-7 left-[calc(50%+40px)] right-[calc(-50%+40px)] h-px bg-[var(--hairline)]"
                    />
                  )}
                  <div className="ed-num w-14 h-14 rounded-full text-lg flex items-center justify-center mx-auto mb-4">
                    {String(i + 1).padStart(2, "0")}
                  </div>
                  <p className="text-sm text-[var(--platinum-dim)]">{t(key)}</p>
                </div>
              ))}
            </div>
            <div className="text-center mt-10">
              <Link href="/register?role=vet" className="btn-editorial">
                {t("vetCtaButton")}
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Sitter benefits */}
      <section id="sitters" className="py-24 md:py-32">
        <div className="section-inner">
          <div className="text-center mb-16">
            <div className="ed-icon w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5">
              <Heart className="w-7 h-7" />
            </div>
            <p className="ed-eyebrow mb-3">{t("sitterTabLabel")}</p>
            <h2 className="ed-title mb-5">{t("sitterHeroTitle")}</h2>
            <p className="text-lg text-[var(--mist-dark)] max-w-xl mx-auto leading-relaxed">
              {t("sitterHeroDesc")}
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-12 max-w-4xl mx-auto">
            {SITTER_BENEFIT_KEYS.map((key, i) => {
              const Icon = SITTER_BENEFIT_ICONS[i];
              return (
                <div key={key} className="lux-card p-7">
                  <div className="ed-icon w-10 h-10 rounded-xl flex items-center justify-center mb-4">
                    <Icon className="w-5 h-5" />
                  </div>
                  <p className="text-sm text-[var(--mist-dark)] leading-relaxed">{t(key)}</p>
                </div>
              );
            })}
          </div>

          {/* How it works */}
          <div className="lux-section-raised rounded-2xl p-8">
            <h3 className="ed-title-sm mb-8 text-center">{t("sitterHowTitle")}</h3>
            <div className="grid md:grid-cols-3 gap-8">
              {SITTER_STEP_KEYS.map((key, i) => (
                <div key={key} className="text-center relative">
                  {i < 2 && (
                    <div
                      aria-hidden
                      className="hidden md:block absolute top-7 left-[calc(50%+40px)] right-[calc(-50%+40px)] h-px bg-[var(--hairline)]"
                    />
                  )}
                  <div className="ed-num w-14 h-14 rounded-full text-lg flex items-center justify-center mx-auto mb-4">
                    {String(i + 1).padStart(2, "0")}
                  </div>
                  <p className="text-sm text-[var(--platinum-dim)]">{t(key)}</p>
                </div>
              ))}
            </div>
            <div className="text-center mt-10">
              <Link href="/register?role=sitter" className="btn-editorial">
                {t("sitterCtaButton")}
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Trust section */}
      <section className="py-20 lux-section border-y border-[var(--hairline-soft)]">
        <div className="section-inner">
          <h2 className="ed-title text-center mb-10">{t("trustTitle")}</h2>
          <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {(["trust1", "trust2"] as const).map((key) => (
              <div key={key} className="lux-card p-7 text-center">
                <div className="ed-icon w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-[var(--platinum)] mb-2">
                  {t(`${key}Title`, { app: APP.name })}
                </h3>
                <p className="text-sm text-[var(--mist-dark)] leading-relaxed">
                  {t(`${key}Desc`, { app: APP.name })}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="lux-section-deep relative overflow-hidden py-24 md:py-32">
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
          <h2 className="ed-title ed-title-on-dark mb-5">{t("ctaTitle")}</h2>
          <p className="text-lg text-[var(--platinum-dim)] opacity-80 mb-10 max-w-xl mx-auto leading-relaxed">
            {t("ctaDesc")}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register?role=vet" className="btn-editorial-light">
              <Stethoscope className="w-4 h-4" />
              {t("ctaVetButton")}
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/register?role=sitter" className="btn-editorial-light">
              <Heart className="w-4 h-4" />
              {t("ctaSitterButton")}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
