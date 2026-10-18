import Link from "next/link";
import { PawPrint, Activity, Heart, Syringe, BarChart3, Globe } from "lucide-react";
import { APP } from "@/lib/config/app";
import { DocumentLanguage } from "@/components/i18n/DocumentLanguage";
import { DEFAULT_LOCALE } from "@/lib/config/locales";

const BRAND_FEATURES = [
  { icon: Activity, text: "Health & vitals tracking" },
  { icon: Heart, text: "Emotional wellbeing scores" },
  { icon: Syringe, text: "Vaccination reminders" },
  { icon: BarChart3, text: "Wellness trends over time" },
  { icon: Globe, text: "9 languages, global community" },
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex">
      {/* The sign-in pages are in English (they live outside [locale]). */}
      <DocumentLanguage locale={DEFAULT_LOCALE} />
      {/* ── Brand panel — obsidian luxury, same surface as the marketing site ── */}
      <div className="hidden lg:flex w-[460px] flex-shrink-0 flex-col bg-[var(--obsidian)] text-[var(--platinum)] p-12 relative overflow-hidden">
        {/* Decorative circles */}
        <div
          aria-hidden
          className="absolute -top-20 -end-20 w-80 h-80 rounded-full bg-[var(--champagne)]/[0.08] pointer-events-none"
        />
        <div
          aria-hidden
          className="absolute bottom-12 -start-16 w-64 h-64 rounded-full bg-[var(--champagne)]/[0.06] pointer-events-none"
        />

        <div className="relative z-10 flex flex-col h-full">
          {/* Logo */}
          <Link
            href="/en"
            className="font-bold text-[var(--platinum)] no-underline flex items-center gap-2.5"
          >
            <div className="w-9 h-9 rounded-xl bg-[var(--champagne)] flex items-center justify-center">
              <PawPrint className="w-5 h-5 text-[var(--obsidian)]" />
            </div>
            <span className="text-lg">{APP.name}</span>
          </Link>

          {/* Hero copy */}
          <div className="mt-auto mb-8">
            <p className="ed-eyebrow mb-4">Pet wellness platform</p>
            <h2 className="font-display font-extralight text-[2.6rem] text-[var(--platinum)] leading-[1.08] tracking-tight mb-4">
              Your pet&apos;s health,
              <br />
              understood.
            </h2>
            <p className="text-[var(--platinum-dim)] text-base leading-relaxed">
              Track wellness. Get insights. Build a deeper bond through care and data.
            </p>
          </div>

          {/* Feature list */}
          <ul className="space-y-2.5 mb-8">
            {BRAND_FEATURES.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3">
                <div className="w-8 h-8 bg-[var(--champagne)]/15 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Icon className="w-4 h-4 text-[var(--champagne)]" />
                </div>
                <span className="text-[var(--platinum-dim)] text-sm">{text}</span>
              </li>
            ))}
          </ul>

          {/* Trust */}
          <div className="pt-5 border-t border-[var(--hairline)]">
            <p className="text-[var(--mist-dark)] text-xs tracking-wide">
              Multi-species · 9 languages · GDPR compliant
            </p>
          </div>
        </div>
      </div>

      {/* ── Form panel — light product surface ── */}
      <div className="auth-panel flex flex-col items-center justify-center px-6 py-12 bg-[var(--off)] min-h-screen">
        {/* Mobile logo */}
        <Link
          href="/en"
          className="lg:hidden font-bold text-[var(--ink)] no-underline flex items-center gap-2 mb-8"
        >
          <div className="w-8 h-8 rounded-xl bg-[var(--obsidian)] flex items-center justify-center">
            <PawPrint className="w-4 h-4 text-[var(--champagne)]" />
          </div>
          <span className="text-lg">{APP.name}</span>
        </Link>

        <div className="auth-card">
          <div className="card p-8 shadow-md">{children}</div>
        </div>
      </div>
    </div>
  );
}
