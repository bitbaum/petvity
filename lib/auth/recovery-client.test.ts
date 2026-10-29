import { describe, it, expect, vi } from "vitest";
import { createRecoveryClient } from "./recovery-client";

const json = (status: number, body: unknown) =>
  Promise.resolve(new Response(JSON.stringify(body), { status }));

describe("createRecoveryClient (Auth.js accounts behind the shared recovery form)", () => {
  it("asks Petvity's own route for a link, sending the address and nothing the browser chose for the link", async () => {
    const fetcher = vi.fn().mockReturnValue(json(200, { success: true }));
    const client = createRecoveryClient(fetcher);
    const out = await client.requestPasswordReset({
      email: "ada@example.com",
      redirectTo: "https://evil.example/steal",
    });
    expect(out).toEqual({ data: {} });
    const [url, init] = fetcher.mock.calls[0]!;
    expect(url).toBe("/api/auth/forgot-password");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual({ email: "ada@example.com" });
  });

  it("sends the token and the new password to the reset route under the name it expects", async () => {
    const fetcher = vi.fn().mockReturnValue(json(200, { success: true }));
    const client = createRecoveryClient(fetcher);
    await client.resetPassword({ token: "t".repeat(64), newPassword: "a long new password" });
    const [url, init] = fetcher.mock.calls[0]!;
    expect(url).toBe("/api/auth/reset-password");
    expect(JSON.parse(init.body)).toEqual({
      token: "t".repeat(64),
      password: "a long new password",
    });
  });

  it("hands an invalid or expired link back with the code the form recognises", async () => {
    const fetcher = vi
      .fn()
      .mockReturnValue(json(400, { success: false, error: "expired", code: "INVALID_TOKEN" }));
    const out = await createRecoveryClient(fetcher).resetPassword({
      token: "x",
      newPassword: "a long new password",
    });
    expect(out).toEqual({
      error: { status: 400, code: "INVALID_TOKEN", message: "expired" },
    });
  });

  it("reports 'mail unavailable' (503) so the form says unavailable instead of pretending a link was sent", async () => {
    const fetcher = vi.fn().mockReturnValue(json(503, { success: false, error: "no mail" }));
    const out = await createRecoveryClient(fetcher).requestPasswordReset({
      email: "a@b.co",
      redirectTo: "/",
    });
    expect(out).toMatchObject({ error: { status: 503 } });
    expect(out).not.toHaveProperty("data");
  });

  it("survives a non-JSON error page (proxy 502) and still reports a failure", async () => {
    const fetcher = vi
      .fn()
      .mockReturnValue(Promise.resolve(new Response("<html>Bad gateway</html>", { status: 502 })));
    const out = await createRecoveryClient(fetcher).requestPasswordReset({
      email: "a@b.co",
      redirectTo: "/",
    });
    expect(out).toMatchObject({ error: { status: 502 } });
  });

  it("lets a dropped connection reject, which the shared form turns into its 'unavailable' state", async () => {
    const fetcher = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));
    const client = createRecoveryClient(fetcher);
    await expect(client.requestPasswordReset({ email: "a@b.co", redirectTo: "/" })).rejects.toThrow(
      "Failed to fetch",
    );
    await expect(
      client.resetPassword({ token: "t", newPassword: "a long new password" }),
    ).rejects.toThrow("Failed to fetch");
  });
});
