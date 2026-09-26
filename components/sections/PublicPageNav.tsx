import Link from "next/link";
import { PawPrint } from "lucide-react";
import { APP } from "@/lib/config/app";

type NavAction = { href: string; label: string };

/**
 * The slim header of the public detail pages (adopt, find, pet and pro
 * profiles). Five pages hand-rolled it, each with its own sub-44px targets —
 * the fleet render sweep counted them — so it lives here once and every
 * control meets the 44px floor (fleet nav contract rule 3).
 */
export function PublicPageNav({
  locale,
  cta,
  signIn,
  sticky = false,
}: {
  locale: string;
  cta: NavAction;
  signIn?: NavAction;
  sticky?: boolean;
}) {
  return (
    <nav
      className={`bg-white border-b border-[var(--border)] px-6 h-14 flex items-center justify-between${
        sticky ? " sticky top-0 z-10" : ""
      }`}
    >
      <Link
        href={`/${locale}`}
        className="font-bold text-[var(--warm-ink)] text-lg no-underline inline-flex min-h-11 items-center gap-2"
      >
        <PawPrint className="w-5 h-5" />
        {APP.name}
      </Link>
      <div className="flex items-center gap-3">
        {signIn && (
          <Link
            href={signIn.href}
            className="inline-flex min-h-11 min-w-11 items-center justify-center text-sm text-[var(--ink2)] hover:text-[var(--warm-ink)] no-underline transition-colors"
          >
            {signIn.label}
          </Link>
        )}
        <Link href={cta.href} className="btn-editorial-sm">
          {cta.label}
        </Link>
      </div>
    </nav>
  );
}
