import { auth } from "@/lib/auth/edge";
import createIntlMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";
import { NextResponse } from "next/server";
import { POST_LOGIN_PATH } from "@/lib/config/auth";

const intlMiddleware = createIntlMiddleware(routing);

// All portal routes live under /portal/ so this stays a single prefix entry.
// IMPORTANT: New portal routes must be nested under /portal/ — do not add
// individual paths here.
const PORTAL_PREFIXES = ["/portal", "/admin"];

// API routes that require authentication (pet/health data, etc.)
// /api/auth/* is handled separately (always public)
// /api/account (registration) and /api/public/* are intentionally public
const PRIVATE_API_PREFIXES = [
  "/api/pets",
  // Health *data*. The liveness probe is /api/healthz, deliberately outside
  // this prefix so it stays reachable without a session.
  "/api/health",
  "/api/vaccinations",
  "/api/medications",
  "/api/vets",
  "/api/sitters",
  "/api/groomers",
  "/api/sellers",
  "/api/bookings",
  "/api/availability",
  // Writes files to disk — never reachable without a session.
  "/api/uploads",
  "/api/reviews",
  // Account orders. /api/shop/* is the guest counterpart and is deliberately
  // NOT listed: requiring a session there would delete guest checkout, which
  // is the whole point of it. It self-guards with a rate limit and, for
  // payment, an unguessable order token.
  "/api/orders",
  // /api/cron/* is intentionally NOT gated — cron routes self-authenticate via
  // the CRON_SECRET bearer (box systemd timers; loki install-app-crons.sh).
  "/api/admin",
];

// Non-localized auth pages — bypass intl routing entirely
// (/demo signs visitors into the shared demo account; logged-in users are
// bounced to their dashboard like on any auth page)
const AUTH_PATHS = ["/login", "/register", "/forgot-password", "/reset-password", "/demo"];

// Non-localized public pages — bypass intl routing AND don't redirect logged-in users.
// /unsubscribe is here so the email link works whether the recipient is logged in or not.
const PUBLIC_BYPASS_PATHS = ["/unsubscribe"];

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;
  const dest = session?.user?.role === "admin" ? "/admin/users" : POST_LOGIN_PATH;

  // ── NextAuth API routes — always public ──────────────────────────────────
  if (pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  // ── Portal / admin / private API ─────────────────────────────────────────
  const isPrivate =
    PORTAL_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/")) ||
    PRIVATE_API_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));

  if (isPrivate) {
    if (!session) {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("returnTo", pathname);
      return NextResponse.redirect(loginUrl);
    }
    if (pathname.startsWith("/admin") && session.user.role !== "admin") {
      return NextResponse.redirect(new URL(POST_LOGIN_PATH, req.url));
    }
    return NextResponse.next();
  }

  // ── Non-localized auth pages ─────────────────────────────────────────────
  // These live at /login, /register etc. — serve directly, skip intl routing.
  // Redirect already-logged-in users to their dashboard.
  if (AUTH_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    if (session) return NextResponse.redirect(new URL(dest, req.url));
    return NextResponse.next();
  }

  // ── Non-localized public pages — pass through regardless of auth state ──
  if (PUBLIC_BYPASS_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return NextResponse.next();
  }

  // ── API routes not already handled above — pass through, no locale routing
  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // ── Marketing site: locale routing ───────────────────────────────────────
  return intlMiddleware(req);
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon|icon|opengraph-image|robots\\.txt|sitemap\\.xml|.*\\..*).*)",
  ],
};
