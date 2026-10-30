/**
 * The proxy reads the session; it must never write it.
 *
 * Auth.js's `auth()` proxy wrapper re-issues the session cookie on every
 * request it sees, Link prefetches included. With JWT sessions a prefetch
 * that left the browser before "Sign out" comes back after it and sets the
 * old, still-valid token again — the person is signed straight back in. The
 * browser journey (scripts/ci/account-journey.mjs) caught this in about one
 * sign-out in three. The session keeps rolling where it should: /api/auth/*,
 * which SessionProvider calls on every page load.
 */
const SESSION_COOKIE = /^(__Secure-)?authjs\.session-token(\.\d+)?=/;

export function withoutSessionCookie<R extends Response>(response: R): R {
  const cookies = response.headers.getSetCookie();
  if (!cookies.some((c) => SESSION_COOKIE.test(c))) return response;
  response.headers.delete("set-cookie");
  for (const cookie of cookies) {
    if (!SESSION_COOKIE.test(cookie)) response.headers.append("set-cookie", cookie);
  }
  return response;
}
