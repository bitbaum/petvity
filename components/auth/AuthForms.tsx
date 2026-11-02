"use client";

import Link from "next/link";
import {
  DEFAULT_AUTH_LABELS,
  AccountPanel as SharedAccountPanel,
  PasswordRecoveryForm,
  SignInForm as SharedSignInForm,
  SignUpForm as SharedSignUpForm,
  type AuthClasses,
} from "@bitbaum/accountkit/auth/react";
// Type only: the runtime half of this entry point pulls in node:crypto.
import type { SignInMethods } from "@bitbaum/accountkit/auth";
import type { ComponentProps } from "react";
import { authClient } from "@/lib/auth/client";

/** AccountKit's shared forms in Petvity's own look. */
export const AUTH_CLASSES: Partial<AuthClasses> = {
  stack: "flex flex-col gap-4",
  field: "flex flex-col gap-1.5",
  label: "form-label",
  input: "form-input",
  hint: "text-sm text-[var(--muted)]",
  notice: "alert-success",
  error: "alert-error",
  button: "btn-primary btn-wrap w-full justify-center py-3 text-base disabled:opacity-60",
  buttonQuiet: "btn-outline btn-wrap w-full justify-center py-3 text-base disabled:opacity-60",
  link: "link-accent",
  section: "card p-6 flex flex-col gap-4",
  sectionTitle: "font-semibold text-[var(--ink)]",
};

export const SIGN_IN_PATH = "/login";
export const SIGN_UP_PATH = "/register";

export function SignInForm(props: { methods: SignInMethods; next: string; initialError: boolean }) {
  return (
    <SharedSignInForm
      {...props}
      client={authClient}
      classes={AUTH_CLASSES}
      signInPath={SIGN_IN_PATH}
      signUpLink={
        <Link href={SIGN_UP_PATH} className="link-accent">
          {DEFAULT_AUTH_LABELS.createAccount}
        </Link>
      }
    />
  );
}

export function SignUpForm(props: { methods: SignInMethods; next: string }) {
  return (
    <SharedSignUpForm
      {...props}
      client={authClient}
      classes={AUTH_CLASSES}
      signUpPath={SIGN_UP_PATH}
      signInPath={SIGN_IN_PATH}
      signInLink={
        <Link href={SIGN_IN_PATH} className="link-accent">
          {DEFAULT_AUTH_LABELS.signIn}
        </Link>
      }
    />
  );
}

export function RecoveryForm(
  props: Pick<
    ComponentProps<typeof PasswordRecoveryForm>,
    "methods" | "token" | "invalidToken" | "next" | "onBack"
  >,
) {
  return (
    <PasswordRecoveryForm
      {...props}
      client={authClient}
      classes={AUTH_CLASSES}
      signInPath={SIGN_IN_PATH}
    />
  );
}

export function AccountPanel(
  props: Pick<
    ComponentProps<typeof SharedAccountPanel>,
    "user" | "linked" | "methods" | "accountPath" | "homePath" | "labels"
  >,
) {
  return <SharedAccountPanel {...props} client={authClient} classes={AUTH_CLASSES} />;
}
