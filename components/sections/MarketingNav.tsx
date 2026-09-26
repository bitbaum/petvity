"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Activity, Search, ShoppingBag, Heart, PawPrint, Menu, X, ChevronDown } from "lucide-react";
import { APP } from "@/lib/config/app";
import { SPECIES_CONFIG, SPECIES_OPTIONS } from "@/lib/config/species";
import type { SpeciesId } from "@/lib/config/species";
import { useTranslations, useLocale } from "next-intl";
import { useSession } from "next-auth/react";
import LocaleSwitcher from "@/components/LocaleSwitcher";
import type { LocaleCode } from "@/lib/config/locales";

/**
 * Marketing header. Deliberately small: three destinations and two actions.
 * Everything else lives one hover away in the Platform menu — four pillars,
 * each linking to its real surface, plus the species guides.
 */
export default function MarketingNav() {
  const t = useTranslations("nav");
  const tPub = useTranslations("public");
  const locale = useLocale() as LocaleCode;
  const { status, data: session } = useSession();
  // Returning users get one CTA pointing where they actually want to go.
  const dashboardHref = session?.user?.role === "admin" ? "/admin/users" : "/portal/dashboard";

  const [menuOpen, setMenuOpen] = useState(false);
  const [platformOpen, setPlatformOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const platformRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setPlatformOpen(false);
        setMenuOpen(false);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (platformRef.current && !platformRef.current.contains(e.target as Node)) {
        setPlatformOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  // The four platform pillars — each links to its real surface.
  const PILLARS = [
    { icon: Activity, label: t("pillarHealth"), desc: t("pillarHealthDesc"), href: "/features" },
    { icon: Search, label: t("pillarPros"), desc: t("pillarProsDesc"), href: "/find" },
    { icon: ShoppingBag, label: t("pillarShop"), desc: t("pillarShopDesc"), href: "/shop" },
    { icon: Heart, label: t("pillarAdopt"), desc: t("pillarAdoptDesc"), href: "/adopt" },
  ];

  const GUIDES = SPECIES_OPTIONS.filter(({ value }) => value !== "other").map(({ value }) => ({
    href: `/species/${value}`,
    emoji: SPECIES_CONFIG[value as SpeciesId].emoji,
    label: tPub(`species_${value}` as Parameters<typeof tPub>[0]),
  }));

  const linkCls =
    "inline-flex min-h-11 items-center px-3 rounded-lg text-sm font-medium text-[var(--platinum-dim)] hover:text-[var(--platinum)] hover:bg-white/[0.06] transition-colors no-underline";

  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-200 bg-[var(--obsidian)]/85 backdrop-blur-xl ${
        scrolled ? "border-b border-[var(--hairline-soft)]" : "border-b border-transparent"
      }`}
    >
      <div className="section-inner h-16 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 no-underline flex-shrink-0">
          <div className="w-8 h-8 rounded-lg bg-[var(--champagne)] flex items-center justify-center">
            <PawPrint className="w-4 h-4 text-[var(--obsidian)]" />
          </div>
          <span className="font-semibold text-[var(--platinum)] text-lg tracking-wide">
            {APP.name}
          </span>
        </Link>

        {/* Desktop nav — Platform ▾ · Pricing · Adopt */}
        <nav className="hidden md:flex items-center gap-1">
          <div ref={platformRef} className="relative">
            <button
              onClick={() => setPlatformOpen((o) => !o)}
              aria-expanded={platformOpen}
              className="flex min-h-11 items-center gap-1 px-3 rounded-lg text-sm font-medium text-[var(--platinum-dim)] hover:text-[var(--platinum)] hover:bg-white/[0.06] transition-colors"
            >
              {t("platform")}
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform duration-150 ${platformOpen ? "rotate-180" : ""}`}
              />
            </button>

            {platformOpen && (
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-[440px] bg-[var(--carbon)] rounded-2xl border border-[var(--hairline)] shadow-xl p-5">
                <div className="grid grid-cols-1 gap-1">
                  {PILLARS.map(({ icon: Icon, label, desc, href }) => (
                    <Link
                      key={href}
                      href={href}
                      onClick={() => setPlatformOpen(false)}
                      className="flex items-start gap-3 p-3 rounded-xl hover:bg-white/[0.05] transition-colors no-underline group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-[var(--champagne)]/10 flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:bg-[var(--champagne)] transition-colors">
                        <Icon className="w-4 h-4 text-[var(--champagne)] group-hover:text-[var(--obsidian)] transition-colors" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-[var(--platinum)] leading-tight">
                          {label}
                        </p>
                        <p className="text-xs text-[var(--mist-dark)] mt-0.5 leading-snug">
                          {desc}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t border-[var(--hairline)]">
                  <p className="text-xs font-semibold uppercase tracking-widest text-[var(--mist-dark)] mb-3">
                    {t("speciesGuides")}
                  </p>
                  <div className="flex items-center gap-2 flex-wrap">
                    {GUIDES.map(({ emoji, label, href }) => (
                      <Link
                        key={href}
                        href={href}
                        onClick={() => setPlatformOpen(false)}
                        className="flex min-h-11 items-center gap-1.5 text-xs font-medium text-[var(--platinum-dim)] bg-white/[0.05] hover:bg-white/[0.09] hover:text-[var(--platinum)] px-3 rounded-full no-underline transition-colors"
                      >
                        <span>{emoji}</span>
                        {label}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          <Link href="/pricing" className={linkCls}>
            {t("pricing")}
          </Link>
          <Link
            href="/adopt"
            className="inline-flex min-h-11 items-center px-3 rounded-lg text-sm font-medium text-[var(--danger-soft)] hover:bg-white/[0.06] transition-colors no-underline"
          >
            ❤️ {t("adopt")}
          </Link>
        </nav>

        {/* Desktop actions */}
        <div className="hidden md:flex items-center gap-3">
          <div className="w-32">
            <LocaleSwitcher current={locale} tone="dark" />
          </div>
          {status === "loading" ? null : status === "authenticated" ? (
            <Link href={dashboardHref} className="btn-editorial-sm">
              {t("goToDashboard")}
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="inline-flex min-h-11 items-center text-sm font-medium text-[var(--platinum-dim)] hover:text-[var(--platinum)] transition-colors no-underline"
              >
                {t("logIn")}
              </Link>
              <Link href="/register" className="btn-editorial-sm">
                {t("getStartedFree")}
              </Link>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setMenuOpen((o) => !o)}
          className="md:hidden inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-[var(--platinum)] hover:bg-white/[0.06] transition-colors"
          aria-label="Toggle menu"
          aria-expanded={menuOpen}
        >
          {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile drawer — same IA as desktop: pillars, guides, actions */}
      {menuOpen && (
        <div className="md:hidden bg-[var(--carbon)] border-t border-[var(--hairline)] shadow-lg max-h-[calc(100vh-4rem)] overflow-y-auto">
          <div className="section-inner py-4 flex flex-col gap-1">
            {PILLARS.map(({ icon: Icon, label, desc, href }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/[0.05] transition-colors no-underline"
              >
                <div className="w-7 h-7 rounded-lg bg-[var(--champagne)]/10 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-3.5 h-3.5 text-[var(--champagne)]" />
                </div>
                <div>
                  <p className="text-sm font-medium text-[var(--platinum)]">{label}</p>
                  <p className="text-xs text-[var(--mist-dark)]">{desc}</p>
                </div>
              </Link>
            ))}
            <Link
              href="/pricing"
              onClick={() => setMenuOpen(false)}
              className="flex min-h-11 items-center px-3 text-sm font-medium text-[var(--platinum-dim)] no-underline"
            >
              {t("pricing")}
            </Link>
            <div className="border-t border-[var(--hairline)] mt-3 pt-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-[var(--mist-dark)] px-3 pb-2">
                {t("speciesGuides")}
              </p>
              <div className="flex gap-2 px-3 pb-3 flex-wrap">
                {GUIDES.map(({ emoji, label, href }) => (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setMenuOpen(false)}
                    className="flex min-h-11 items-center gap-1 text-sm font-medium text-[var(--platinum-dim)] bg-white/[0.05] px-3 rounded-full no-underline"
                  >
                    <span>{emoji}</span>
                    {label}
                  </Link>
                ))}
              </div>
            </div>
            <div className="border-t border-[var(--hairline)] pt-3 flex flex-col gap-2">
              {status === "loading" ? null : status === "authenticated" ? (
                <Link
                  href={dashboardHref}
                  onClick={() => setMenuOpen(false)}
                  className="btn-editorial justify-center"
                >
                  {t("goToDashboard")}
                </Link>
              ) : (
                <>
                  <Link
                    href="/login"
                    onClick={() => setMenuOpen(false)}
                    className="flex min-h-11 items-center px-3 text-sm font-medium text-[var(--platinum-dim)] hover:text-[var(--platinum)] no-underline"
                  >
                    {t("logIn")}
                  </Link>
                  <Link
                    href="/register"
                    onClick={() => setMenuOpen(false)}
                    className="btn-editorial justify-center"
                  >
                    {t("getStartedFree")}
                  </Link>
                </>
              )}
              <div className="pt-2 border-t border-[var(--hairline)] mt-1">
                <LocaleSwitcher current={locale} tone="dark" />
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
