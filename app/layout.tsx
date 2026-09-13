import type { Metadata } from "next";
import Script from "next/script";
import { SessionProvider } from "next-auth/react";
import { APP, APP_URL } from "@/lib/config/app";
import { fontVariables } from "@/lib/fonts";
import "./globals.css";

const TITLE = `${APP.name} — The global platform for pet care`;
const DESCRIPTION =
  "Track your pet's health, connect with vets, find pet sitters, and give your animals the life they deserve.";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: TITLE,
  description: DESCRIPTION,
  keywords: ["pet care", "pet health", "veterinarian", "pet tracker", "dog", "cat", "horse"],
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: APP_URL,
    siteName: APP.name,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" dir="ltr" className={fontVariables}>
      <body>
        <SessionProvider>{children}</SessionProvider>

        {/* Loki feedback widget — env-gated, see docs/architecture/feedback-widget.md */}
        {process.env.NEXT_PUBLIC_FC_WIDGET_TOKEN && (
          <Script
            src="https://loki.orangecat.ch/widget.js"
            strategy="afterInteractive"
            data-fc-project={process.env.NEXT_PUBLIC_FC_WIDGET_TOKEN}
          />
        )}
      </body>
    </html>
  );
}
