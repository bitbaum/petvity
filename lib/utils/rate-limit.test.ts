import { describe, it, expect } from "vitest";
import { clientKey } from "./rate-limit";

/**
 * The window arithmetic now belongs to limitkit and is tested there. What is
 * still ours — and what was actually broken — is which forwarded hop we key on.
 */
describe("clientKey", () => {
  it("takes the hop Caddy wrote, not the one the client sent", () => {
    // Caddy APPENDS what it saw, so the last entry is ours. The first is a
    // string the caller typed: the previous implementation keyed on it, which
    // meant a fresh bucket per request and a limit that never tripped.
    const req = new Request("https://example.test", {
      headers: { "x-forwarded-for": "203.0.113.7, 10.0.0.1" },
    });
    expect(clientKey(req)).toBe("10.0.0.1");
  });

  it("cannot be split into new buckets by varying the client-supplied hops", () => {
    const key = (forwarded: string) =>
      clientKey(new Request("https://example.test", { headers: { "x-forwarded-for": forwarded } }));

    // One real client behind Caddy, sending a different lie each time.
    expect(key("1.2.3.4, 10.0.0.1")).toBe(key("5.6.7.8, 10.0.0.1"));
    expect(key("a, b, c, 10.0.0.1")).toBe(key("10.0.0.1"));
  });

  it("falls back to x-real-ip", () => {
    const req = new Request("https://example.test", {
      headers: { "x-real-ip": "203.0.113.9" },
    });
    expect(clientKey(req)).toBe("203.0.113.9");
  });

  it("groups headerless requests rather than crashing", () => {
    // "unknown" throttles the anonymous bucket collectively, which is the right
    // failure mode for the abuse this blunts.
    expect(clientKey(new Request("https://example.test"))).toBe("unknown");
  });
});
