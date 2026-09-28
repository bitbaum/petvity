"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { ArrowRight } from "lucide-react";

/** Hero call-to-action — session-aware so returning users see "Open my
 *  dashboard" instead of a redundant "Get started free" that the middleware
 *  would just bounce away. Stays a small client island so the rest of the
 *  homepage can render statically. */
export function HeroCTA() {
  const t = useTranslations("nav");
  const { status, data: session } = useSession();
  const dashboardHref = session?.user?.role === "admin" ? "/admin/users" : "/portal/dashboard";

  return (
    <div className="flex flex-col sm:flex-row gap-3 mb-10">
      {status === "loading" ? (
        // Reserve the same vertical space so the layout doesn't shift on hydration
        <div aria-hidden className="h-[52px]" />
      ) : status === "authenticated" ? (
        <>
          <Link href={dashboardHref} className="btn-editorial justify-center">
            {t("goToDashboard")}
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link href="#features" className="btn-editorial-ghost justify-center">
            {t("howItWorks")}
          </Link>
        </>
      ) : (
        <>
          <Link href="/register" className="btn-editorial justify-center">
            {t("getStartedFree")}
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link href="/demo" className="btn-editorial-ghost justify-center">
            {t("tryDemo")}
          </Link>
        </>
      )}
    </div>
  );
}
