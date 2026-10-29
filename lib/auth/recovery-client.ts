/**
 * Petvity's password recovery runs on its own Auth.js users, bcrypt passwords
 * and roles (`/api/auth/forgot-password`, `/api/auth/reset-password`). The
 * shared form from @bitbaum/accountkit needs only two calls, so this adapter
 * gives it those two and leaves the accounts exactly where they are.
 *
 * A failed answer comes back as `{ error }` for the form to word. A dropped
 * connection (fetch rejects) is NOT caught here: the form catches it, leaves
 * its busy state and shows the "unavailable" message, so nothing is stuck.
 */
import type { PasswordRecoveryClient } from "@bitbaum/accountkit/auth/react";

type Answer = { success?: boolean; error?: string; code?: string };

async function post(fetcher: typeof fetch, url: string, body: unknown) {
  const res = await fetcher(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  let answer: Answer = {};
  try {
    answer = (await res.json()) as Answer;
  } catch {
    // A proxy error page is not JSON; the status below still says what failed.
  }
  if (res.ok && answer.success) return { data: {} };
  return { error: { status: res.status, code: answer.code, message: answer.error } };
}

export function createRecoveryClient(
  fetcher: typeof fetch = (...args) => fetch(...args),
): Required<PasswordRecoveryClient> {
  return {
    // `redirectTo` is deliberately unused: the server builds the reset link
    // from its own origin, never from anything the browser sends.
    requestPasswordReset: ({ email }) => post(fetcher, "/api/auth/forgot-password", { email }),
    resetPassword: ({ token, newPassword }) =>
      post(fetcher, "/api/auth/reset-password", { token, password: newPassword }),
  };
}
