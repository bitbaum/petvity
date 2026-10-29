export const APP = {
  name: "Petvity",
  tagline: "The global platform for pet care",
  /** The one public contact address. Only the orangecat.ch apex receives mail:
   *  petvity.com is not ours, and <app>@fleetcrown.orangecat.ch is send-only. */
  email: "cato@orangecat.ch",
  foundingYear: 2026,
} as const;

export const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://petvity.orangecat.ch";

/** ISO 4217 currency code for all price display. Override with NEXT_PUBLIC_APP_CURRENCY. */
export const APP_CURRENCY = process.env.NEXT_PUBLIC_APP_CURRENCY ?? "USD";

export function getAdminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}
