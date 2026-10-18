"use client";

import { useEffect } from "react";
import { LOCALE_CONFIG, type LocaleCode } from "@/lib/config/locales";

/**
 * Says which language the page is in, on the one <html> the root layout
 * renders.
 *
 * The [locale] layout used to render a second <html> of its own. React keeps
 * one document element and, when that nested <html> unmounted on a client
 * navigation from the marketing site into /login or /portal, cleared what it
 * had set on it: lang, dir and the font classes. Every page after that had
 * no language and fell back to the system font — measured on the live site
 * (2026-10-18, /de → /login): lang null, class "", body font Roboto — which
 * the owner, walking the site, called "the design is inconsistent".
 *
 * Each route group renders this with its own locale; the root layout's
 * server-rendered attributes are the first paint, this keeps them right
 * across client navigations.
 */
export function DocumentLanguage({ locale }: { locale: string }) {
  const dir = LOCALE_CONFIG[locale as LocaleCode]?.dir ?? "ltr";
  useEffect(() => {
    const html = document.documentElement;
    if (html.lang !== locale) html.lang = locale;
    if (html.dir !== dir) html.dir = dir;
  }, [locale, dir]);
  return null;
}
