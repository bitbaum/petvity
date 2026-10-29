"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PasswordRecoveryForm, type AuthClasses } from "@bitbaum/accountkit/auth/react";
// Type only: the runtime half of this entry point pulls in node:crypto.
import type { SignInMethods } from "@bitbaum/accountkit/auth";
import { createRecoveryClient } from "@/lib/auth/recovery-client";

// Recovery is the one thing this page offers; no other sign-in method shows.
const METHODS: SignInMethods = {
  password: true,
  passkey: false,
  twoFactor: false,
  magicLink: false,
  verifyEmail: false,
  signin: false,
  orangecat: false,
  passwordReset: true,
};

// The shared form in Petvity's own look.
const CLASSES: Partial<AuthClasses> = {
  stack: "flex flex-col gap-4",
  field: "flex flex-col gap-1.5",
  label: "form-label",
  input: "form-input",
  hint: "text-sm text-[var(--muted)]",
  notice: "alert-success",
  error: "alert-error",
  button: "btn-primary w-full justify-center py-3 text-base disabled:opacity-60",
  buttonQuiet: "link-accent",
};

function Recovery({ mode }: { mode: "forgot" | "reset" }) {
  const router = useRouter();
  const params = useSearchParams();
  // Read once: the token leaves the address bar below, the form keeps it.
  const [token] = useState(() =>
    mode === "reset" ? (params.get("token") ?? undefined) : undefined,
  );
  const client = useMemo(() => createRecoveryClient(), []);

  useEffect(() => {
    if (token) window.history.replaceState(null, "", window.location.pathname);
  }, [token]);

  return (
    <>
      <h1 className="font-display font-medium text-3xl mb-1 text-[var(--warm-ink)]">
        {token ? "Set new password" : "Reset your password"}
      </h1>
      <p className="text-sm text-[var(--muted)] mb-7">
        {token ? "Choose a strong password." : "Enter your email and we'll send you a reset link."}
      </p>
      <PasswordRecoveryForm
        client={client}
        methods={METHODS}
        signInPath="/login"
        next="/portal/dashboard"
        token={token}
        invalidToken={mode === "reset" && !token}
        classes={CLASSES}
        onBack={() => router.push("/login")}
      />
    </>
  );
}

export function RecoveryScreen({ mode }: { mode: "forgot" | "reset" }) {
  return (
    <Suspense>
      <Recovery mode={mode} />
    </Suspense>
  );
}
