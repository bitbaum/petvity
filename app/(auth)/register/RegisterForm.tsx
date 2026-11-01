"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { PawPrint, Stethoscope, Heart, Scissors } from "lucide-react";
// Type only: the runtime half of this entry point pulls in node:crypto.
import type { SignInMethods } from "@bitbaum/accountkit/auth";
import { SignUpForm } from "@/components/auth/AuthForms";
import { USER_ROLE_CONFIG } from "@/lib/config/users";
import { PORTAL_ROUTES } from "@/lib/config/routes";

const INTENDED_ROLES = ["pet_owner", "veterinarian", "pet_sitter", "groomer"] as const;
type IntendedRole = (typeof INTENDED_ROLES)[number];

/* Labels come from the role SSOT; icons and the sign-up pitch are auth-page UI. */
const ROLE_UI: Record<IntendedRole, { icon: React.ElementType; desc: string }> = {
  pet_owner: { icon: PawPrint, desc: "Track my pet's health" },
  veterinarian: { icon: Stethoscope, desc: "Offer vet services" },
  pet_sitter: { icon: Heart, desc: "Offer sitting & boarding" },
  groomer: { icon: Scissors, desc: "Offer grooming services" },
};

const ROLE_OPTIONS = INTENDED_ROLES.map((id) => ({
  id,
  label: USER_ROLE_CONFIG[id].label,
  ...ROLE_UI[id],
}));

/**
 * Every account starts as a pet owner (AccountKit's sign-up asks for an email
 * and a password, nothing else, and never lets a sign-up choose its role). The
 * choice here says where the new person lands: a first pet, or the self-serve
 * upgrade for vets, sitters and groomers.
 */
export function RegisterForm({ methods }: { methods: SignInMethods }) {
  const roleParam = useSearchParams().get("role");
  const [intendedRole, setIntendedRole] = useState<IntendedRole>(
    roleParam === "vet"
      ? "veterinarian"
      : roleParam === "sitter"
        ? "pet_sitter"
        : roleParam === "groomer"
          ? "groomer"
          : "pet_owner",
  );
  const next =
    intendedRole === "pet_owner"
      ? `${PORTAL_ROUTES.pets}/new?from=registration`
      : PORTAL_ROUTES.becomeAPro;

  return (
    <>
      <h1 className="font-display font-medium text-3xl mb-1 text-[var(--warm-ink)]">
        Start for free
      </h1>
      <p className="text-sm text-[var(--muted)] mb-6">No credit card · Cancel anytime</p>

      {/* Role selector */}
      <div className="mb-5">
        <p className="text-sm font-medium text-[var(--ink2)] mb-2">I am joining as…</p>
        <div className="grid grid-cols-3 gap-2">
          {ROLE_OPTIONS.map(({ id, icon: Icon, label, desc }) => {
            const selected = intendedRole === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setIntendedRole(id)}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 text-center transition-all ${
                  selected
                    ? "border-[var(--teal)] bg-[var(--teal-light)]"
                    : "border-[var(--border)] hover:border-[var(--teal-light)] hover:bg-[var(--off)]"
                }`}
              >
                <Icon
                  className={`w-5 h-5 ${selected ? "text-[var(--teal)]" : "text-[var(--muted)]"}`}
                />
                <span
                  className={`text-xs font-semibold leading-tight ${selected ? "text-[var(--teal)]" : "text-[var(--ink2)]"}`}
                >
                  {label}
                </span>
                <span className="text-xs text-[var(--muted)] leading-tight hidden sm:block">
                  {desc}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <SignUpForm methods={methods} next={next} />

      <p className="mt-5 text-center text-xs text-[var(--muted)] leading-relaxed">
        By continuing, you agree to our{" "}
        <Link href="/en/legal/terms" className="link-accent font-normal">
          Terms of Service
        </Link>{" "}
        and{" "}
        <Link href="/en/legal/privacy" className="link-accent font-normal">
          Privacy Policy
        </Link>
        .
      </p>
    </>
  );
}
