#!/usr/bin/env node
/**
 * Every way into a Petvity account, in a real Chromium against the production
 * build and a PostgreSQL built from the committed migrations plus the cutover
 * import (.github/workflows/browser-smoke.yml):
 *
 *   - the sign-in, sign-up and recovery pages at 320px and 390px: no sideways
 *     scroll, no Google button, and the method set the env asks for (password,
 *     passkey, email link, recovery, OrangeCat, the bitbaum sign-in);
 *   - sign up through AccountKit's form, sign out, a wrong password refused,
 *     the right one accepted;
 *   - an account imported from Auth.js (bcrypt, seeded before the import)
 *     signs in with its old password and keeps its role;
 *   - recovery: the reset link from the mail, a new password, the old one
 *     refused;
 *   - an email sign-in link signs in;
 *   - the sign-in and security page offers passkeys and a second factor.
 *
 * Mail is real AccountKit mail caught by scripts/ci/mail-sink.cjs (MAIL_SINK).
 * Synthetic people only.
 *
 *   BASE_URL=http://localhost:3000 MAIL_SINK=… LEGACY_EMAIL=… LEGACY_PASSWORD=… \
 *     node scripts/ci/account-journey.mjs
 */
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const OUT = path.join(process.env.SMOKE_OUT ?? "browser-smoke-artifacts", "account");
const SINK = process.env.MAIL_SINK;
const LEGACY_EMAIL = process.env.LEGACY_EMAIL;
const LEGACY_PASSWORD = process.env.LEGACY_PASSWORD;
const run = Date.now().toString(36);
const EMAIL = `journey-${run}@example.test`;
const PASSWORD = `synthetic journey password ${run}`;
const NEW_LEGACY_PASSWORD = `synthetic reset password ${run}`;

const EXPECT = {
  orangecat: Boolean(process.env.ORANGECAT_OAUTH_CLIENT_ID),
  // Since AccountKit 0.24 the shared sign-in's button names the providers its
  // service publishes (<SIGNIN_ISSUER>/api/providers), and shows only when
  // there is one. The journey's synthetic issuer publishes none, so the
  // button must be hidden: one that leads to an empty page is a dead end.
  signin: false,
  mail: Boolean(SINK),
};

const failures = [];
const check = (ok, what) => {
  console.log(`${ok ? "PASS" : "FAIL"} ${what}`);
  if (!ok) failures.push(what);
};
const shot = (page, name) =>
  page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: true });
const session = (page) =>
  page.evaluate(async () => (await (await fetch("/api/auth/session")).json())?.user ?? null);
const pathOf = (page) => new URL(page.url()).pathname;
const button = (page, name) => page.getByRole("button", { name, exact: true });

/** The newest link to `route` in a message to `to`, from the mail sink. */
async function mailedLink(to, route) {
  for (let i = 0; i < 30; i++) {
    const lines = (await readFile(SINK, "utf8").catch(() => "")).split("\n").filter(Boolean);
    for (const line of lines.reverse()) {
      const mail = JSON.parse(line);
      if (![mail.to].flat().includes(to)) continue;
      const html = String(mail.html ?? mail.text ?? "").replaceAll("&amp;", "&");
      const link = html.match(new RegExp(`https?://[^"'\\s<>]*${route}[^"'\\s<>]*`));
      if (link) return link[0];
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`no ${route} link was mailed to the journey address`);
}

async function signInWithPassword(page, email, password) {
  await page.goto(`${BASE}/login`);
  await page.locator('input[autocomplete="username webauthn"]').fill(email);
  await page.locator('input[autocomplete="current-password"]').fill(password);
  await button(page, "Sign in").click();
}

async function signOut(page) {
  await page.goto(`${BASE}/portal/dashboard`);
  await button(page, "Sign out").click();
  await page.waitForURL((url) => url.pathname === "/login", { timeout: 30_000 });
}

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch(
  process.env.BROWSER_EXECUTABLE ? { executablePath: process.env.BROWSER_EXECUTABLE } : {},
);
let page;

try {
  // ── No Google without its client pair ──────────────────────────────────
  const providers = await (await fetch(`${BASE}/api/auth/providers`)).json();
  check(!("google" in providers), `no Google provider is mounted (${Object.keys(providers)})`);

  // ── Every auth page at phone widths: no sideways scroll, no Google ─────
  for (const width of [320, 390]) {
    const phone = await browser.newPage({ viewport: { width, height: 844 } });
    for (const route of ["/login", "/register", "/forgot-password"]) {
      await phone.goto(`${BASE}${route}`);
      await phone.waitForLoadState("networkidle");
      const overflow = await phone.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      );
      check(overflow <= 0, `${route} at ${width}px has no sideways scroll (${overflow}px)`);
      const google = phone.getByRole("button", { name: /^(sign in|continue) with google$/i });
      check((await google.count()) === 0, `${route} at ${width}px has no Google-only button`);
      await shot(phone, `${width}${route.replaceAll("/", "-")}`);
    }
    await phone.close();
  }

  page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const pageErrors = [];
  page.on("pageerror", (e) => pageErrors.push(e.message));

  // ── The method set, on the sign-in and the sign-up page ────────────────
  const offered = async (route, labels) => {
    await page.goto(`${BASE}${route}`);
    for (const [name, wanted] of labels) {
      const count = await button(page, name).count();
      check(
        wanted ? count === 1 : count === 0,
        `${route} ${wanted ? "offers" : "hides"} "${name}"`,
      );
    }
  };
  await offered("/login", [
    ["Sign in", true],
    ["Sign in with a passkey", true],
    ["Email me a sign-in link instead", EXPECT.mail],
    ["Forgot your password?", EXPECT.mail],
    ["Continue with OrangeCat", EXPECT.orangecat],
    [/^Continue with (Google|Apple|GitHub|X|Facebook|Microsoft)/, EXPECT.signin],
    ["Explore the demo — no account needed", true],
  ]);
  await shot(page, "login-methods");
  await offered("/register", [
    ["Create an account", true],
    ["Email me a link instead", EXPECT.mail],
    ["Continue with OrangeCat", EXPECT.orangecat],
    [/^Continue with (Google|Apple|GitHub|X|Facebook|Microsoft)/, EXPECT.signin],
  ]);

  // ── Sign up through AccountKit's form ──────────────────────────────────
  await page.goto(`${BASE}/register`);
  await page.locator('input[autocomplete="email"]').fill(EMAIL);
  await page.locator('input[autocomplete="new-password"]').fill(PASSWORD);
  await button(page, "Create an account").click();
  await page.waitForURL((url) => url.pathname.startsWith("/portal"), { timeout: 30_000 });
  check(pathOf(page) === "/portal/pets/new", "sign-up lands on adding a first pet");
  const created = await session(page);
  check(created?.email === EMAIL, "sign-up signs the new person in");
  check(created?.role === "pet_owner", "a new account is a pet owner");
  await shot(page, "after-register");

  // ── Sign out ───────────────────────────────────────────────────────────
  await signOut(page);
  check((await session(page)) === null, "sign-out ends the session");
  await page.goto(`${BASE}/portal/dashboard`);
  check(pathOf(page) === "/login", "the portal sends a signed-out visitor to /login");

  // ── A wrong password is refused, the right one works ───────────────────
  await signInWithPassword(page, EMAIL, "not the password");
  await page.getByText("That email and password do not match").waitFor({ timeout: 30_000 });
  check(pathOf(page) === "/login" && (await session(page)) === null, "a wrong password is refused");
  await shot(page, "login-refused");

  await signInWithPassword(page, EMAIL, PASSWORD);
  await page.waitForURL((url) => url.pathname === "/portal/dashboard", { timeout: 30_000 });
  check((await session(page))?.email === EMAIL, "sign-in with the right password works");
  await shot(page, "dashboard-after-sign-in");

  // ── Sign-in and security: passkeys and a second factor ─────────────────
  await page.goto(`${BASE}/portal/settings/security`);
  for (const title of ["Passkeys", "Two-factor sign-in"]) {
    check(
      (await page.getByText(title, { exact: true }).count()) > 0,
      `the security page offers ${title}`,
    );
  }
  await shot(page, "security");
  await signOut(page);

  // ── An account imported from Auth.js ───────────────────────────────────
  if (LEGACY_EMAIL && LEGACY_PASSWORD) {
    await signInWithPassword(page, LEGACY_EMAIL, LEGACY_PASSWORD);
    await page.waitForURL((url) => url.pathname === "/portal/dashboard", { timeout: 30_000 });
    const legacy = await session(page);
    check(
      legacy?.email === LEGACY_EMAIL && legacy?.role === "veterinarian",
      "an imported account signs in with its old password and keeps its role",
    );
    await signOut(page);
  } else {
    check(false, "LEGACY_EMAIL and LEGACY_PASSWORD are set");
  }

  if (EXPECT.mail && LEGACY_EMAIL) {
    // ── Recovery: the mailed link, a new password ────────────────────────
    await page.goto(`${BASE}/forgot-password`);
    await page.locator('input[autocomplete="email"]').fill(LEGACY_EMAIL);
    await button(page, "Email me a reset link").click();
    await page.getByText("If an account can be recovered").waitFor({ timeout: 30_000 });
    check(true, "the recovery page sends a reset link");
    await page.goto(await mailedLink(LEGACY_EMAIL, "/api/auth/reset-password/"));
    await page.waitForURL((url) => url.pathname === "/login", { timeout: 30_000 });
    await page.locator('input[autocomplete="new-password"]').fill(NEW_LEGACY_PASSWORD);
    check(!page.url().includes("token="), "the reset token leaves the address bar");
    await button(page, "Reset password").click();
    await page.getByText("Your password has been changed").waitFor({ timeout: 30_000 });
    await shot(page, "reset-done");
    await signInWithPassword(page, LEGACY_EMAIL, LEGACY_PASSWORD);
    await page.getByText("That email and password do not match").waitFor({ timeout: 30_000 });
    check(true, "after a reset the old password is refused");
    await signInWithPassword(page, LEGACY_EMAIL, NEW_LEGACY_PASSWORD);
    await page.waitForURL((url) => url.pathname === "/portal/dashboard", { timeout: 30_000 });
    check((await session(page))?.email === LEGACY_EMAIL, "the new password signs in");
    await signOut(page);

    // ── An email sign-in link ────────────────────────────────────────────
    await page.goto(`${BASE}/login`);
    await page.locator('input[autocomplete="username webauthn"]').fill(EMAIL);
    await button(page, "Email me a sign-in link instead").click();
    await page.getByText(`We sent a link to ${EMAIL}`).waitFor({ timeout: 30_000 });
    await page.goto(await mailedLink(EMAIL, "/api/auth/magic-link/verify"));
    await page.waitForURL((url) => url.pathname.startsWith("/portal"), { timeout: 30_000 });
    check((await session(page))?.email === EMAIL, "an email sign-in link signs in");
  }

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
