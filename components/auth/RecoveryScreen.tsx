"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
// Type only: the runtime half of this entry point pulls in node:crypto.
import type { SignInMethods } from "@bitbaum/accountkit/auth";
import { RecoveryForm, SIGN_IN_PATH } from "@/components/auth/AuthForms";
import { POST_LOGIN_PATH } from "@/lib/config/auth";

/**
 * "Forgot password?": AccountKit's recovery form. The link it mails lands on
 * /login, where the sign-in form sets the new password. Every other way in
 * (an email link, a passkey, OrangeCat, the bitbaum sign-in) is one tap away.
 */
export function RecoveryScreen({ methods }: { methods: SignInMethods }) {
  const router = useRouter();
  return (
    <>
      <h1 className="font-display font-medium text-3xl mb-1 text-[var(--warm-ink)]">
        Reset your password
      </h1>
      <p className="text-sm text-[var(--muted)] mb-7">
        Enter your email and we&apos;ll send you a reset link.
      </p>
      {methods.passwordReset ? (
        <RecoveryForm
          methods={methods}
          next={POST_LOGIN_PATH}
          onBack={() => router.push(SIGN_IN_PATH)}
        />
      ) : (
        // A reset link needs account mail; without it, say so and offer the rest.
        <p className="alert-error">
          Reset links cannot be sent right now. Sign in another way, or try again later.
        </p>
      )}
      <p className="mt-6 text-center text-sm text-[var(--muted)]">
        <Link href={SIGN_IN_PATH} className="link-accent">
          Other ways to sign in
        </Link>
      </p>
    </>
  );
}
