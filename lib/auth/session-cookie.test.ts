import { describe, expect, it } from "vitest";
import { withoutSessionCookie } from "./session-cookie";

function response(...cookies: string[]) {
  const res = new Response(null);
  for (const c of cookies) res.headers.append("set-cookie", c);
  return res;
}

describe("withoutSessionCookie", () => {
  it("drops a re-issued session token, plain or __Secure-, whole or chunked", () => {
    const res = withoutSessionCookie(
      response(
        "authjs.session-token=abc; Path=/; HttpOnly",
        "__Secure-authjs.session-token=abc; Path=/; Secure",
        "authjs.session-token.0=abc; Path=/",
      ),
    );
    expect(res.headers.getSetCookie()).toEqual([]);
  });

  it("keeps every other cookie, such as the locale", () => {
    const res = withoutSessionCookie(
      response("NEXT_LOCALE=de; Path=/", "authjs.session-token=abc; Path=/"),
    );
    expect(res.headers.getSetCookie()).toEqual(["NEXT_LOCALE=de; Path=/"]);
  });

  it("leaves a response without a session cookie untouched", () => {
    const res = response("authjs.csrf-token=x; Path=/");
    expect(withoutSessionCookie(res)).toBe(res);
    expect(res.headers.getSetCookie()).toEqual(["authjs.csrf-token=x; Path=/"]);
  });
});
