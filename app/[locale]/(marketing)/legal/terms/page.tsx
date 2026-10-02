import type { Metadata } from "next";
import Link from "next/link";
import { APP } from "@/lib/config/app";
import { LegalPage } from "../_components/LegalPage";

export const metadata: Metadata = {
  title: `Terms of Service · ${APP.name}`,
  description: `The agreement between you and ${APP.name} when you use the platform.`,
};

const EFFECTIVE_DATE = "April 26, 2026";

export default function TermsOfServicePage() {
  return (
    <LegalPage title="Terms of Service" effectiveDate={EFFECTIVE_DATE}>
      <p>
        These terms govern your use of {APP.name}. By creating an account you agree to them. If you
        don&apos;t, please don&apos;t use the service.
      </p>

      <h2>1. The service</h2>
      <p>
        {APP.name} is a platform for tracking pet wellness, connecting with veterinarians and pet
        sitters, buying and selling pet products, and listing or finding pets for adoption. We
        provide the platform; you provide the data and the relationships with other users.
      </p>

      <h2>2. Your account</h2>
      <ul>
        <li>You must be 16 or older (or the digital-consent age in your jurisdiction)</li>
        <li>Provide accurate information; keep your credentials secure</li>
        <li>You&apos;re responsible for everything that happens under your account</li>
        <li>
          One person per account; one account per person, except where you legitimately operate
          distinct vet/sitter business profiles
        </li>
      </ul>

      <h2>3. Acceptable use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>Impersonate someone else, including other users, vets, or {APP.name} staff</li>
        <li>Post false information about your pets, listings, or services</li>
        <li>Harass, threaten, or harm other users — owners, vets, sitters, adopters</li>
        <li>Submit fraudulent adoption applications or marketplace orders</li>
        <li>Scrape, mass-export, or attempt to reverse-engineer the platform</li>
        <li>Upload malware, attempt to breach security, or interfere with operation</li>
      </ul>
      <p>
        We may suspend or terminate accounts that violate these rules, with or without notice
        depending on severity.
      </p>

      <h2>4. Veterinary advice disclaimer</h2>
      <p>
        <strong>{APP.name} is not a substitute for professional veterinary care.</strong> Wellness
        signals, range checks, and reminders are informational tools to help you spot changes early.
        They do not diagnose disease. If your pet shows symptoms or you have any concern about their
        health, contact a licensed veterinarian. In an emergency, call your nearest emergency vet
        immediately.
      </p>

      <h2>5. Marketplace</h2>
      <p>
        Sellers (other users or {APP.name} as a platform) list products at their own discretion.{" "}
        {APP.name} facilitates the transaction but is not a party to peer-to-peer sales. Sellers are
        responsible for accurate descriptions, lawful product offerings, and fulfillment. Buyers are
        responsible for reading listings carefully before ordering.
      </p>

      <h2>6. Adoption</h2>
      <p>
        {APP.name} facilitates adoption listings and applications. We do not verify the suitability
        of either the listing pet or the applicant. Owners and applicants are encouraged to meet,
        vet documentation, and follow local animal-adoption laws before any transfer takes place.
      </p>

      <h2>7. Bookings with vets and sitters</h2>
      <p>
        Bookings are agreements between you and the professional you book.
        {APP.name} provides the discovery, scheduling, and review surface. Disputes about service
        quality are between you and the professional; we may help mediate but are not the service
        provider.
      </p>

      <h2>8. Termination</h2>
      <p>
        You can delete your account at any time from Settings → Danger zone. We may terminate
        accounts for material breach of these terms or prolonged inactivity (with notice).
      </p>

      <h2>9. Limitation of liability</h2>
      <p>
        To the fullest extent allowed by law, {APP.name} is provided &quot;as is&quot; without
        warranties of any kind. We are not liable for indirect, incidental, or consequential damages
        arising from use of the platform — including (but not limited to) decisions made based on
        wellness signals, marketplace transactions, or adoption matches.
      </p>

      <h2>10. Changes</h2>
      <p>
        We may update these terms. The effective date above will reflect any change, and we&apos;ll
        notify active users by email of material changes.
      </p>

      <h2>11. Contact</h2>
      <p>
        Questions about these terms: <a href={`mailto:${APP.email}`}>{APP.email}</a>.
      </p>

      <p>
        See also: <Link href="/legal/privacy">Privacy Policy</Link> ·{" "}
        <Link href="/legal/cookies">Cookie Policy</Link>
      </p>
    </LegalPage>
  );
}
