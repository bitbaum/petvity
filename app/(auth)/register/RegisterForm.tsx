"use client";

import { useState, useRef, useEffect } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { PawPrint, Stethoscope, Heart, Scissors } from "lucide-react";
import { PASSWORD_MIN_LENGTH } from "@/lib/config/auth";
import { USER_ROLE_CONFIG } from "@/lib/config/users";
import { PasswordInput } from "@/components/portal/PasswordInput";
import { OrangecatButton } from "@/components/auth/OrangecatButton";
import { PasswordDisclosure } from "@/components/auth/PasswordDisclosure";
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

export function RegisterForm({ orangecat }: { orangecat: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const roleParam = searchParams.get("role");
  const nameRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [intendedRole, setIntendedRole] = useState<IntendedRole>(
    roleParam === "vet"
      ? "veterinarian"
      : roleParam === "sitter"
        ? "pet_sitter"
        : roleParam === "groomer"
          ? "groomer"
          : "pet_owner",
  );
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!orangecat) nameRef.current?.focus();
  }, [orangecat]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }

    setLoading(true);
    const res = await fetch("/api/account", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim() || undefined, email, password, intendedRole }),
    });
    const data = await res.json();

    if (!data.success) {
      setLoading(false);
      setError(data.error ?? "Registration failed.");
      return;
    }

    const signInRes = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);
    if (signInRes?.error) {
      setError("Account created — please log in.");
    } else {
      router.push(
        intendedRole === "pet_owner"
          ? "/portal/pets/new?from=registration"
          : "/portal/professional-profile",
      );
    }
  }

  return (
    <>
      <h1 className="font-display font-medium text-3xl mb-1 text-[var(--warm-ink)]">
        Start for free
      </h1>
      <p className="text-sm text-[var(--muted)] mb-6">No credit card · Cancel anytime</p>

      {error && <p className="alert-error mb-5">{error}</p>}

      {orangecat && (
        <OrangecatButton
          label="Create an account with OrangeCat"
          hint="Google, GitHub or email — one account for all OrangeCat apps"
          // Every OrangeCat account starts as a pet owner; a pro (from ?role=)
          // lands on the self-serve upgrade instead of the add-a-pet form.
          redirectTo={
            intendedRole === "pet_owner"
              ? `${PORTAL_ROUTES.pets}/new?from=registration`
              : PORTAL_ROUTES.becomeAPro
          }
        />
      )}

      <PasswordDisclosure collapsible={orangecat} summary="Sign up with email and password instead">
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

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="form-label">Your name</label>
            <input
              ref={nameRef}
              type="text"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="form-input"
              placeholder="George"
            />
          </div>

          <div>
            <label className="form-label">Email</label>
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="form-input"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="form-label">Password</label>
            <PasswordInput
              value={password}
              onChange={setPassword}
              autoComplete="new-password"
              required
              minLength={PASSWORD_MIN_LENGTH}
              placeholder={`At least ${PASSWORD_MIN_LENGTH} characters`}
            />
          </div>

          <div>
            <label className="form-label">Confirm password</label>
            <PasswordInput
              value={confirm}
              onChange={setConfirm}
              autoComplete="new-password"
              required
              placeholder="Repeat your password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full justify-center mt-1 py-3 text-base disabled:opacity-60"
          >
            {loading
              ? "Setting up your account…"
              : intendedRole === "pet_owner"
                ? "Begin your pet's wellness journey"
                : "Create professional account"}
          </button>
        </form>
      </PasswordDisclosure>

      <p className="mt-6 text-center text-sm text-[var(--muted)]">
        Already have an account?{" "}
        <Link href="/login" className="link-accent">
          Log in
        </Link>
      </p>

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
