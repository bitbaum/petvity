import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { DocumentLanguage } from "@/components/i18n/DocumentLanguage";

/**
 * No html element here: the root layout renders the only one. A second, nested one
 * lost the page's language and fonts on the way into the portal — see
 * components/i18n/DocumentLanguage.tsx.
 */
export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const messages = await getMessages();

  return (
    <NextIntlClientProvider messages={messages}>
      <DocumentLanguage locale={locale} />
      {children}
    </NextIntlClientProvider>
  );
}
