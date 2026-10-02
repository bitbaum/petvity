"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";

/**
 * The primary way into petvity: OrangeCat's own sign-in page offers Google,
 * GitHub, email + password, an emailed code and open registration, so one
 * button carries all of them.
 */
export function OrangecatButton({
  label,
  hint,
  redirectTo,
}: {
  label: string;
  hint?: string;
  redirectTo: string;
}) {
  const [pending, setPending] = useState(false);
  return (
    <div>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          setPending(true);
          void signIn("orangecat", { redirectTo });
        }}
        className="btn-primary w-full justify-center py-3 text-base disabled:opacity-60"
      >
        {pending ? "Opening OrangeCat…" : label}
      </button>
      {hint && <p className="mt-2 text-center text-xs text-[var(--muted)]">{hint}</p>}
    </div>
  );
}
