#!/usr/bin/env node
/**
 * Real-Chromium check of the password-recovery pages against a production
 * build (`pnpm build` first). The network is stubbed per request, so no
 * database, mail or account is touched: what is under test is the shared
 * recovery form from @bitbaum/accountkit wired to Petvity's two routes.
 *
 * Usage: node scripts/ci/recovery-browser-check.mjs [baseUrl]
 * Without a base URL it starts `next start` itself on a free port.
 */
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { chromium } from "playwright";

const OUT = process.env.SMOKE_OUT ?? "browser-smoke-artifacts";
mkdirSync(OUT, { recursive: true });

let server;
let base = process.argv[2];
if (!base) {
  const port = 3100 + Math.floor(Math.random() * 500);
  base = `http://127.0.0.1:${port}`;
  server = spawn(
    process.execPath,
    ["node_modules/next/dist/bin/next", "start", "-p", String(port), "-H", "127.0.0.1"],
    {
      env: {
        ...process.env,
        DATABASE_URL: process.env.DATABASE_URL ?? "postgres://ci:ci@localhost:5432/ci",
        AUTH_TRUST_HOST: "true",
        NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ?? "ci-secret-ci-secret-ci-secret-ci-secret",
      },
      stdio: "inherit",
    },
  );
  for (let i = 0; ; i++) {
    try {
      if ((await fetch(base + "/forgot-password")).ok) break;
    } catch {
      /* not up yet */
    }
    if (i > 120) throw new Error("next start did not come up");
    await new Promise((r) => setTimeout(r, 500));
  }
}

let failed = 0;
const check = (ok, name) => {
  console.log(`${ok ? "PASS" : "FAIL"} ${name}`);
  if (!ok) failed++;
};

const browser = await chromium.launch();
try {
  for (const width of [390, 1280]) {
    const ctx = await browser.newContext({ viewport: { width, height: 844 } });
    const page = await ctx.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    const tag = `[${width}]`;

    // ── Request a link: a dropped connection, then a retry that works ──
    const sent = [];
    let requests = 0;
    await page.route("**/api/auth/forgot-password", async (route) => {
      sent.push(JSON.parse(route.request().postData() ?? "{}"));
      if (requests++ === 0) return route.abort("failed");
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: '{"success":true}',
      });
    });
    await page.goto(base + "/forgot-password");
    await page.getByLabel("Email", { exact: true }).fill("ada@example.com");
    const send = page.getByRole("button", { name: "Email me a reset link" });
    await send.click();
    await page.locator('p[role="alert"]').waitFor();
    check(await send.isEnabled(), `${tag} a network failure does not leave the request form stuck`);
    check(
      (await page.getByLabel("Email", { exact: true }).inputValue()) === "ada@example.com",
      `${tag} the typed address is kept`,
    );
    await send.click();
    await page.getByRole("status").waitFor();
    check(
      (await page.getByRole("status").textContent()).includes("reset link will arrive"),
      `${tag} the retry shows the same answer for every address`,
    );
    check(
      sent.length === 2 && sent.every((b) => b.email === "ada@example.com" && !("redirectTo" in b)),
      `${tag} only the address is sent, never a link target`,
    );
    await page.screenshot({ path: `${OUT}/forgot-${width}.png`, fullPage: true });

    // ── Reset with a token: stripped from the address bar, network failure, retry ──
    const resets = [];
    let attempts = 0;
    await page.route("**/api/auth/reset-password", async (route) => {
      resets.push(JSON.parse(route.request().postData() ?? "{}"));
      attempts++;
      if (attempts === 1) return route.abort("failed");
      if (attempts === 2)
        return route.fulfill({
          status: 400,
          contentType: "application/json",
          body: '{"success":false,"error":"expired","code":"INVALID_TOKEN"}',
        });
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: '{"success":true}',
      });
    });
    const token = "a".repeat(64);
    await page.goto(base + "/reset-password?token=" + token);
    await page.getByLabel("New password", { exact: true }).waitFor();
    check(!page.url().includes("token="), `${tag} the token leaves the address bar`);
    // accountkit 0.9.1 asks for the new password once, with a show/hide eye
    // (the same PasswordField as sign-up); there is no repeat field.
    const newPassword = page.getByLabel("New password", { exact: true });
    check(
      (await page.locator('input[type="password"]').count()) === 1,
      `${tag} the new password is asked for once`,
    );
    await newPassword.fill("a new long password");
    await page.getByRole("button", { name: "Show password" }).click();
    check(
      (await newPassword.getAttribute("type")) === "text",
      `${tag} the eye shows the typed password`,
    );
    await page.getByRole("button", { name: "Hide password" }).click();
    const reset = page.getByRole("button", { name: "Reset password", exact: true });
    await reset.click();
    await page
      .waitForFunction(
        () =>
          document.querySelector('[role="alert"]')?.textContent?.includes("unavailable") ?? false,
      )
      .catch(() => {});
    check(await reset.isEnabled(), `${tag} a network failure does not leave the reset form stuck`);
    await reset.click();
    await page.getByLabel("Email", { exact: true }).waitFor();
    check(
      (await page.locator('p[role="alert"]').textContent()).includes("invalid or has expired"),
      `${tag} an expired link returns to requesting a new one`,
    );
    check(
      resets[0].token === token && resets[0].password === "a new long password",
      `${tag} the token and password reach Petvity's route as it expects them`,
    );

    // A fresh valid reset through to success.
    await page.goto(base + "/reset-password?token=" + token);
    await page.getByLabel("New password", { exact: true }).fill("a new long password");
    await page.getByRole("button", { name: "Reset password", exact: true }).click();
    await page.getByRole("status").waitFor();
    check(
      (await page.getByRole("status").textContent()).includes("has been changed"),
      `${tag} a valid reset succeeds`,
    );
    await page.screenshot({ path: `${OUT}/reset-done-${width}.png`, fullPage: true });
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await page.waitForURL("**/login");
    check(true, `${tag} "Sign in" returns to the login page`);

    // ── No token at all: say so and offer a new link ──
    await page.goto(base + "/reset-password");
    await page.getByLabel("Email", { exact: true }).waitFor();
    check(
      (await page.locator('p[role="alert"]').textContent()).includes("invalid or has expired"),
      `${tag} a reset link without a token explains itself`,
    );
    check(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      `${tag} no sideways scroll`,
    );
    check(errors.length === 0, `${tag} no runtime errors ${errors.join("|")}`);
    await ctx.close();
  }
} finally {
  await browser.close();
  server?.kill();
}
if (failed) {
  console.error(`${failed} check(s) failed`);
  process.exit(1);
}
console.log("all recovery browser checks passed");
