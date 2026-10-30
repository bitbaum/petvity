#!/usr/bin/env node
/**
 * An account can be made and used, in a real Chromium against a production
 * build and a real PostgreSQL: register through /register (the page posts to
 * /api/account, then signs in with the credentials provider), see the portal,
 * sign out from the sidebar, a wrong password refused on /login, the right one
 * accepted. With no GOOGLE_* pair in the environment no Google provider is
 * mounted and no Google button is drawn — the guard for the invalid_client
 * (client_id=undefined) sign-in that was live on 2026-10-30.
 *
 * Run by .github/workflows/browser-smoke.yml. Synthetic people only; the
 * welcome mail is skipped (example.test is undeliverable, no mail key is set).
 *
 *   BASE_URL=http://localhost:3000 node scripts/ci/account-journey.mjs
 */
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const OUT = path.join(process.env.SMOKE_OUT ?? "browser-smoke-artifacts", "account");
const run = Date.now().toString(36);
const EMAIL = `journey-${run}@example.test`;
const PASSWORD = `synthetic journey password ${run}`;

const failures = [];
const check = (ok, what) => {
  console.log(`${ok ? "PASS" : "FAIL"} ${what}`);
  if (!ok) failures.push(what);
};
const shot = (page, name) =>
  page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: true });
const sessionEmail = (page) =>
  page.evaluate(async () => (await (await fetch("/api/auth/session")).json())?.user?.email ?? null);

async function fillCredentials(page, password) {
  await page.locator('input[autocomplete="email"]').fill(EMAIL);
  await page.locator('input[autocomplete="current-password"]').fill(password);
  await page.getByRole("button", { name: "Continue to dashboard" }).click();
}

async function noGoogleButton(page, route) {
  const google = page
    .getByRole("button", { name: /google/i })
    .or(page.getByRole("link", { name: /google/i }));
  check((await google.count()) === 0, `${route} shows no Google button`);
}

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch(
  process.env.BROWSER_EXECUTABLE ? { executablePath: process.env.BROWSER_EXECUTABLE } : {},
);
let page;

try {
  // ── No Google without its client pair ──────────────────────────────────
  if (!process.env.GOOGLE_CLIENT_ID && !process.env.GOOGLE_CLIENT_SECRET) {
    const providers = await (await fetch(`${BASE}/api/auth/providers`)).json();
    check(!("google" in providers), `no Google provider is mounted (${Object.keys(providers)})`);
    check("credentials" in providers, "the credentials provider is mounted");
  }

  // ── Every auth page at phone width: no sideways scroll, no Google ──────
  const phone = await browser.newPage({ viewport: { width: 390, height: 844 } });
  for (const route of ["/login", "/register"]) {
    await phone.goto(`${BASE}${route}`);
    await phone.waitForLoadState("networkidle");
    const overflow = await phone.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    check(overflow <= 0, `${route} at 390px has no sideways scroll (${overflow}px)`);
    if (!process.env.GOOGLE_CLIENT_ID) await noGoogleButton(phone, route);
    await shot(phone, `390${route.replaceAll("/", "-")}`);
  }
  await phone.close();

  // The sidebar with "Sign out" is the desktop layout (lg and up).
  page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const pageErrors = [];
  page.on("pageerror", (e) => pageErrors.push(e.message));

  // ── Register through the page ──────────────────────────────────────────
  await page.goto(`${BASE}/register`);
  await page.locator('input[autocomplete="name"]').fill("Journey Person");
  await page.locator('input[autocomplete="email"]').fill(EMAIL);
  const passwords = page.locator('input[autocomplete="new-password"]');
  await passwords.nth(0).fill(PASSWORD);
  await passwords.nth(1).fill(PASSWORD);
  await page.getByRole("button", { name: "Begin your pet's wellness journey" }).click();
  await page.waitForURL((url) => url.pathname.startsWith("/portal"), { timeout: 30_000 });
  check(new URL(page.url()).pathname === "/portal/pets/new", "sign-up lands on adding a first pet");
  check((await sessionEmail(page)) === EMAIL, "sign-up signs the new person in");
  await shot(page, "after-register");

  // ── The signed-in state ────────────────────────────────────────────────
  await page.goto(`${BASE}/portal/dashboard`);
  check(new URL(page.url()).pathname === "/portal/dashboard", "the dashboard opens when signed in");
  const signOut = page.getByRole("button", { name: "Sign out" });
  await signOut.waitFor({ timeout: 15_000 });
  check(await page.getByText("Journey Person").first().isVisible(), "the portal names the person");
  await shot(page, "dashboard");

  // ── Sign out ───────────────────────────────────────────────────────────
  await signOut.click();
  await page.waitForURL((url) => url.pathname === "/login", { timeout: 30_000 });
  check((await sessionEmail(page)) === null, "sign-out ends the session");
  await page.goto(`${BASE}/portal/dashboard`);
  check(
    new URL(page.url()).pathname === "/login",
    "the portal sends a signed-out visitor to /login",
  );

  // ── A wrong password is refused ────────────────────────────────────────
  await page.goto(`${BASE}/login`);
  await fillCredentials(page, "not the password");
  await page.getByText("Incorrect email or password").waitFor({ timeout: 30_000 });
  check(
    new URL(page.url()).pathname === "/login" && (await sessionEmail(page)) === null,
    "a wrong password is refused",
  );
  await shot(page, "login-refused");

  // ── The right password works ───────────────────────────────────────────
  await page.goto(`${BASE}/login`);
  await fillCredentials(page, PASSWORD);
  await page.waitForURL((url) => url.pathname === "/portal/dashboard", { timeout: 30_000 });
  check((await sessionEmail(page)) === EMAIL, "sign-in with the right password works");
  await page.getByRole("button", { name: "Sign out" }).waitFor({ timeout: 15_000 });
  await shot(page, "dashboard-after-sign-in");

  check(pageErrors.length === 0, `no uncaught page errors (${pageErrors.join(" | ")})`);
} catch (error) {
  failures.push(error instanceof Error ? error.message : String(error));
  console.error(error);
  await page?.screenshot({ path: path.join(OUT, "failure.png"), fullPage: true }).catch(() => {});
} finally {
  await browser.close();
}

if (failures.length) {
  console.error(`\n${failures.length} check(s) failed`);
  process.exit(1);
}
console.log("\naccount journey passed");
