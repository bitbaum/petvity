import type { Metadata } from "next";
import Link from "next/link";
import { APP } from "@/lib/config/app";
import { LegalPage } from "../_components/LegalPage";

export const metadata: Metadata = {
  title: `Privacy Policy · ${APP.name}`,
  description: `How ${APP.name} collects, uses, and protects your data.`,
};

const EFFECTIVE_DATE = "October 2, 2026";

export default function PrivacyPolicyPage() {
  return (
    <LegalPage title="Privacy Policy" effectiveDate={EFFECTIVE_DATE}>
      <p>
        This policy describes what data {APP.name} collects, why we collect it, and the rights you
        have over it. We aim to write it in plain language — if anything is unclear, write to{" "}
        <a href={`mailto:${APP.email}`}>{APP.email}</a>.
      </p>

      <h2>1. Data we collect</h2>
      <h3>Account</h3>
      <ul>
        <li>Email address</li>
        <li>Display name (you set this; defaults to your email prefix)</li>
        <li>
          If you sign up with email: your password, stored only as a bcrypt hash; we never see the
          plaintext
        </li>
        <li>If you sign in with OrangeCat: your OrangeCat account ID</li>
        <li>Role (pet owner, veterinarian, pet sitter, groomer, or admin)</li>
        <li>Preferred language and email-preferences flags</li>
      </ul>

      <h3>Pet data you enter</h3>
      <ul>
        <li>Pet profile: name, species, breed, sex, birth date, photo, bio</li>
        <li>
          Health metrics you log: weight, temperature, heart rate, mood, energy, anxiety,
          socialization
        </li>
        <li>Vaccination, medication, and clinical-record entries</li>
      </ul>

      <h3>Activity</h3>
      <ul>
        <li>Bookings you make with vets, sitters, or groomers</li>
        <li>Reviews you write</li>
        <li>
          Orders you place and products you list in the marketplace — for an order placed without an
          account, the email and shipping address you enter at checkout
        </li>
        <li>Adoption listings and applications you submit</li>
      </ul>

      <h2>2. How we use it</h2>
      <ul>
        <li>
          To run the service: render your dashboard, compute wellness signals, process orders,
          deliver email notifications
        </li>
        <li>
          To send transactional email (vaccination reminders, health alerts, order confirmations,
          booking reminders)
        </li>
        <li>
          To send the optional welcome onboarding series — opt-out from the email footer or in
          Settings → Email preferences
        </li>
        <li>To comply with legal obligations</li>
      </ul>
      <p>
        We <strong>do not</strong> sell your data, share it with advertisers, or use it to train AI
        models.
      </p>

      <h2>3. Service providers</h2>
      <p>
        {APP.name} relies on a small set of vendors to operate. Each has its own privacy practices;
        we share only the minimum data each one needs.
      </p>
      <ul>
        <li>
          <strong>Hetzner</strong> — our own server in Germany, which runs the application and the
          PostgreSQL database that holds your data; pet avatars and uploads are stored here on local
          disk
        </li>
        <li>
          <strong>Resend</strong> — transactional email delivery
        </li>
        <li>
          <strong>OrangeCat</strong> — only if you sign in with OrangeCat; it confirms who you are
          and sends us your name, email address, profile picture, and account ID
        </li>
        <li>
          <strong>Loki</strong> — the feedback button on every page, loaded from loki.orangecat.ch;
          only what you choose to send through it (your message, an optional contact address, any
          screenshot you attach) and the address of the page you sent it from reaches Loki
        </li>
      </ul>

      <h2>4. Cookies</h2>
      <p>
        We use a small set of strictly-necessary cookies; details on the{" "}
        <Link href="/legal/cookies">cookie policy</Link> page.
      </p>

      <h2>5. Your rights</h2>
      <p>
        Under GDPR (and similar laws elsewhere) you have these rights, all of which we make
        exercisable directly from your account:
      </p>
      <ul>
        <li>
          <strong>Access</strong> — download a copy of every row stored under your account from
          Settings → Your data, or via <code>GET /api/account/export</code>
        </li>
        <li>
          <strong>Erasure</strong> — delete your account and all related data from Settings → Danger
          zone. The deletion cascades through pets, metrics, vaccinations, records, bookings,
          orders, listings, and applications. This is irreversible.
        </li>
        <li>
          <strong>Rectification</strong> — edit any of your data directly in the app
        </li>
        <li>
          <strong>Portability</strong> — the export above is JSON, suitable for moving to another
          service
        </li>
        <li>
          <strong>Object / restrict</strong> — opt out of the welcome email series at any time;
          transactional emails remain because they&apos;re necessary for the service you signed up
          for
        </li>
        <li>
          <strong>Lodge a complaint</strong> — with your local data protection authority
        </li>
      </ul>

      <h2>6. Retention</h2>
      <p>
        We keep your data for as long as your account exists. When you delete your account, the
        cascade removes everything immediately. Transactional email logs at our email provider may
        persist for a short period for deliverability auditing.
      </p>

      <h2>7. Security</h2>
      <p>
        Passwords are hashed with bcrypt. All traffic to {APP.name} is served over HTTPS. The
        database accepts connections only from the server it runs on. No system is perfectly secure
        — if we ever discover a breach affecting your data, we will notify you without undue delay.
      </p>

      <h2>8. Changes</h2>
      <p>
        If we materially change this policy we will update the effective date above and notify
        active users by email.
      </p>

      <h2>9. Contact</h2>
      <p>
        Privacy questions: <a href={`mailto:${APP.email}`}>{APP.email}</a>.
      </p>
    </LegalPage>
  );
}
