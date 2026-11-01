import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { authLabelsFor, isDeliverable } from "@bitbaum/accountkit/auth";
import { AccountPanel } from "@/components/auth/AuthForms";
import PageHeader from "@/components/portal/PageHeader";
import { auth } from "@/lib/auth";
import { petvityMethods } from "@/lib/auth/methods";
import { sharedAuth } from "@/lib/auth/shared/runtime";
import { DEMO_REFUSAL } from "@/lib/auth/shared/petvity-plugin";
import { isDemoEmail } from "@/lib/config/demo";
import { PORTAL_ROUTES } from "@/lib/config/routes";
import { getPortalLocale } from "@/lib/i18n/portal-locale";

// Methods depend on runtime env, and the panel on who is signed in.
export const dynamic = "force-dynamic";

/**
 * How this person signs in: password, passkeys, a second factor, linked
 * OrangeCat and bitbaum sign-ins, and deleting the account. AccountKit's own
 * panel; deleting there removes the Petvity account and everything in it
 * (the auth_users → users mirror, migration 0009).
 */
export default async function SecurityPage() {
  const session = await auth();
  if (!session) redirect(`/login?returnTo=${encodeURIComponent(PORTAL_ROUTES.security)}`);
  const t = await getTranslations("portal");
  const requestHeaders = await headers();
  const [shared, accounts, locale] = await Promise.all([
    sharedAuth.getSession(),
    sharedAuth
      .getAuth()
      .api.listUserAccounts({ headers: requestHeaders })
      .catch(() => []),
    getPortalLocale(),
  ]);
  const user = shared?.user as
    (NonNullable<typeof shared>["user"] & { twoFactorEnabled?: boolean | null }) | undefined;

  return (
    <div className="max-w-lg">
      <PageHeader title={t("settingsSecurityTitle")} purpose={t("settingsSecurityDesc")} />
      {isDemoEmail(session.user.email) ? (
        <p className="alert-error">{DEMO_REFUSAL}</p>
      ) : (
        <AccountPanel
          labels={authLabelsFor(locale)}
          user={{
            name: user?.name ?? session.user.name ?? "",
            email: user && isDeliverable(user.email) ? user.email : null,
            emailVerified: Boolean(user?.emailVerified),
            role: session.user.role,
            twoFactorEnabled: Boolean(user?.twoFactorEnabled),
          }}
          linked={accounts.map((a) => a.providerId)}
          methods={petvityMethods()}
          accountPath={PORTAL_ROUTES.security}
          homePath="/en"
        />
      )}
    </div>
  );
}
