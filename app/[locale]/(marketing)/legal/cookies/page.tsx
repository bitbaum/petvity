import type { Metadata } from "next";
import Link from "next/link";
import { APP } from "@/lib/config/app";
import { LegalPage } from "../_components/LegalPage";

export const metadata: Metadata = {
  title: `Cookie Policy · ${APP.name}`,
  description: `What cookies ${APP.name} uses and why.`,
};

const EFFECTIVE_DATE = "October 2, 2026";

export default function CookiePolicyPage() {
  return (
    <LegalPage title="Cookie Policy" effectiveDate={EFFECTIVE_DATE}>
      <p>
        {APP.name} uses a small number of cookies, all in the &quot;strictly necessary&quot; or
        &quot;preference&quot; categories. We do not use advertising or third-party tracking
        cookies.
      </p>

      <h2>Cookies we set</h2>

      <h3>Authentication (strictly necessary)</h3>
      <ul>
        <li>
          <code>__Secure-authjs.session-token</code> — your signed-in session. HttpOnly, Secure,
          SameSite=Lax. Cleared on sign-out.
        </li>
        <li>
          <code>__Host-authjs.csrf-token</code> — CSRF protection for authentication endpoints.
        </li>
        <li>
          <code>__Secure-authjs.callback-url</code> — preserves your intended destination across the
          login flow.
        </li>
        <li>
          <code>__Secure-authjs.pkce.code_verifier</code>, <code>__Secure-authjs.state</code> — only
          while you sign in with OrangeCat; they protect that sign-in and expire after 15 minutes.
        </li>
      </ul>

      <h3>Preferences</h3>
      <ul>
        <li>
          <code>NEXT_LOCALE</code> — remembers the language of the pages you are reading, so the
          site stays in that language. Cleared when you close your browser.
        </li>
      </ul>

      <h2>Analytics</h2>
      <p>
        We do not use any third-party analytics or advertising cookies, and we do not track or
        identify individual users.
      </p>

      <h2>Managing cookies</h2>
      <p>
        You can clear cookies for {APP.name} at any time from your browser settings. Clearing the
        authentication cookies will sign you out; clearing the preference cookies will reset your
        language to the default. We don&apos;t set anything that requires a cookie banner under GDPR
        / ePrivacy because all cookies above are strictly necessary to sign you in or to keep the
        site in the language you are reading.
      </p>

      <h2>Contact</h2>
      <p>
        Questions: <a href={`mailto:${APP.email}`}>{APP.email}</a>.
      </p>

      <p>
        See also: <Link href="/legal/privacy">Privacy Policy</Link> ·{" "}
        <Link href="/legal/terms">Terms of Service</Link>
      </p>
    </LegalPage>
  );
}
