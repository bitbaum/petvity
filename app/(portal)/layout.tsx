import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import SidebarNav from "@/components/portal/SidebarNav";
import { getPortalLocale } from "@/lib/i18n/portal-locale";
import { DocumentLanguage } from "@/components/i18n/DocumentLanguage";
import type { LocaleCode } from "@/lib/config/locales";
import { getInstance } from "@/lib/db";
import { sellerProfiles } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/login");

  const db = getInstance();
  const [locale, sellerProfile] = await Promise.all([
    getPortalLocale(),
    db.query.sellerProfiles.findFirst({
      where: eq(sellerProfiles.userId, session.user.id),
      columns: { id: true },
    }),
  ]);

  const messages = (await import(`../../messages/${locale}.json`)).default;

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <DocumentLanguage locale={locale} />
      <div className="min-h-screen bg-[var(--off)]">
        <SidebarNav
          userName={session.user.name}
          userEmail={session.user.email}
          userRole={session.user.role}
          hasSeller={!!sellerProfile}
          locale={locale as LocaleCode}
        />
        {/* Offset for desktop sidebar (w-60) and mobile top/bottom bars */}
        <div className="lg:ps-60">
          <main className="pt-14 lg:pt-0 pb-20 lg:pb-0 min-h-screen">
            <div className="max-w-4xl mx-auto px-4 lg:px-8 py-8">{children}</div>
          </main>
        </div>
      </div>
    </NextIntlClientProvider>
  );
}
