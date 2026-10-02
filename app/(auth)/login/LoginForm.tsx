"use client";

import { useState, useRef, useEffect } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { PasswordInput } from "@/components/portal/PasswordInput";
import { OrangecatButton } from "@/components/auth/OrangecatButton";
import { PasswordDisclosure } from "@/components/auth/PasswordDisclosure";
import { safeReturnTo } from "@/lib/auth/safe-redirect";
import { DEMO_ACCOUNT } from "@/lib/config/demo";
import { POST_LOGIN_PATH } from "@/lib/config/auth";

/** Auth.js sends a failed OAuth round-trip back here as ?error=<code>. */
const OAUTH_ERROR = "Signing in with OrangeCat didn't complete. Please try again.";

export function LoginForm({ orangecat }: { orangecat: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = safeReturnTo(searchParams.get("returnTo"), POST_LOGIN_PATH);
  const emailRef = useRef<HTMLInputElement>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(searchParams.get("error") ? OAUTH_ERROR : "");
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);

  async function handleDemo() {
    setError("");
    setDemoLoading(true);
    const res = await signIn("credentials", {
      email: DEMO_ACCOUNT.email,
      password: DEMO_ACCOUNT.password,
      redirect: false,
    });
    setDemoLoading(false);
    if (res?.error) {
      setError("The demo is being refreshed — please try again in a minute.");
    } else {
      router.push(POST_LOGIN_PATH);
    }
  }

  useEffect(() => {
    // With OrangeCat offered the password form sits in a closed disclosure.
    if (!orangecat) emailRef.current?.focus();
  }, [orangecat]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);
    if (res?.error) {
      setError("Incorrect email or password. Please try again.");
    } else {
      router.push(returnTo);
    }
  }

  return (
    <>
      <h1 className="font-display font-medium text-3xl mb-1 text-[var(--warm-ink)]">
        Welcome back
      </h1>
      <p className="text-sm text-[var(--muted)] mb-7">Your pets missed you 🐾</p>

      {error && <p className="alert-error mb-5">{error}</p>}

      {orangecat && (
        <OrangecatButton
          label="Sign in with OrangeCat"
          hint="Google, GitHub or email — one account for all OrangeCat apps"
          redirectTo={returnTo}
        />
      )}

      <PasswordDisclosure collapsible={orangecat} summary="Sign in with email and password instead">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="form-label">Email</label>
            <input
              ref={emailRef}
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
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-medium text-[var(--ink2)]">Password</label>
              <Link
                href="/forgot-password"
                className="text-sm text-[var(--muted)] hover:text-[var(--teal)] no-underline transition-colors"
              >
                Forgot password?
              </Link>
            </div>
            <PasswordInput
              value={password}
              onChange={setPassword}
              autoComplete="current-password"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full justify-center mt-1 py-3 text-base disabled:opacity-60"
          >
            {loading ? "Signing in…" : "Continue to dashboard"}
          </button>
        </form>
      </PasswordDisclosure>

      <div className="mt-6 flex items-center gap-3" aria-hidden>
        <span className="h-px flex-1 bg-[var(--border)]" />
        <span className="text-xs uppercase tracking-wide text-[var(--muted)]">or</span>
        <span className="h-px flex-1 bg-[var(--border)]" />
      </div>

      <button
        type="button"
        onClick={handleDemo}
        disabled={demoLoading}
        className="btn-outline w-full justify-center mt-6 py-3 text-base disabled:opacity-60"
      >
        {demoLoading ? "Opening the demo…" : "Explore the demo — no account needed"}
      </button>

      <p className="mt-6 text-center text-sm text-[var(--muted)]">
        No account?{" "}
        <Link href="/register" className="link-accent">
          Start for free
        </Link>
      </p>
    </>
  );
}
