"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
// Type only: the runtime half of this entry point pulls in node:crypto.
import type { SignInMethods } from "@bitbaum/accountkit/auth";
import { SignInForm } from "@/components/auth/AuthForms";
import { DEMO_ACCOUNT } from "@/lib/config/demo";
import { POST_LOGIN_PATH } from "@/lib/config/auth";

export function LoginForm({
  methods,
  next,
  initialError,
}: {
  methods: SignInMethods;
  next: string;
  initialError: boolean;
}) {
  const router = useRouter();
  const [demoError, setDemoError] = useState("");
  const [demoLoading, setDemoLoading] = useState(false);

  async function handleDemo() {
    setDemoError("");
    setDemoLoading(true);
    const res = await signIn("credentials", {
      email: DEMO_ACCOUNT.email,
      password: DEMO_ACCOUNT.password,
      redirect: false,
    });
    setDemoLoading(false);
    if (res?.error) {
      setDemoError("The demo is being refreshed — please try again in a minute.");
    } else {
      router.push(POST_LOGIN_PATH);
    }
  }

  return (
    <>
      <h1 className="font-display font-medium text-3xl mb-1 text-[var(--warm-ink)]">
        Welcome back
      </h1>
      <p className="text-sm text-[var(--muted)] mb-7">Your pets missed you 🐾</p>

      <SignInForm methods={methods} next={next} initialError={initialError} />

      <div className="mt-6 flex items-center gap-3" aria-hidden>
        <span className="h-px flex-1 bg-[var(--border)]" />
        <span className="text-xs uppercase tracking-wide text-[var(--muted)]">or</span>
        <span className="h-px flex-1 bg-[var(--border)]" />
      </div>

      {demoError && <p className="alert-error mt-6">{demoError}</p>}
      <button
        type="button"
        onClick={handleDemo}
        disabled={demoLoading}
        className="btn-outline btn-wrap w-full justify-center mt-6 py-3 text-base disabled:opacity-60"
      >
        {demoLoading ? "Opening the demo…" : "Explore the demo — no account needed"}
      </button>
    </>
  );
}
