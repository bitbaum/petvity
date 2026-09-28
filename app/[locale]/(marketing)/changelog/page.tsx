import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { APP } from "@/lib/config/app";
import { buildAlternates } from "@/lib/i18n/alternates";
import DevelopmentRecords from "../_components/DevelopmentRecords";

type Params = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "development" });
  const title = t("changelogMetaTitle", { app: APP.name });
  const description = t("changelogMetaDesc", { app: APP.name });
  return {
    title,
    description,
    openGraph: { title, description },
    twitter: { card: "summary", title, description },
    alternates: buildAlternates("/changelog"),
  };
}

export default async function ChangelogPage({ params }: Params) {
  const { locale } = await params;
  return <DevelopmentRecords locale={locale} section="changelog" />;
}
