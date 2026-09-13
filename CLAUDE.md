@~/.claude/CLAUDE.md
@AGENTS.md

## Mission

Petvity gives pet owners a single place to monitor their pet's daily wellness, connect with local vets and sitters, and manage the full care journey — from health logs and vaccinations to marketplace orders and cross-border adoption. Success means any owner can check their pet's signal in seconds, understand why it changed, and take immediate action without leaving the platform.

# Petvity — Project Standards & Agentic Runbook

**What this is:** Global pet care platform. Owners manage multi-species pet profiles, track physical + emotional health KPIs, connect with vets/sitters (Phase 2), access a marketplace (Phase 3), and list pets for cross-border adoption (Phase 4). Pets can have public "influencer profiles." Long-term vision: digital twins (IoT sensors, cameras, emotional state). Part of the same ecosystem as Vita and Surf Your Life.

**Deployed URLs:**
- Production: https://petvity.orangecat.ch
- GitHub: https://github.com/bitbaum/petvity
- Host: self-hosted Hetzner box `bitbaum` (service `petvity-app`, port 4013, behind Caddy auto-TLS)
- Database: self-hosted PostgreSQL 17 on the box (database `petvity`)

**Stack:** Next.js 16 (App Router, standalone output) · TypeScript strict · Tailwind v4 ·
self-hosted PostgreSQL 17 · Drizzle ORM (`node-postgres` driver) · NextAuth 5 · Resend email ·
local-disk file storage (pet photos) · next-intl
(9 languages: EN DE FR ES JA ZH KO TR AR — AR is RTL) · Lucide React icons · Recharts · Zod

---

## Development Workflow

```bash
pnpm dev          # local dev (localhost:3000)
pnpm build        # production build — MUST pass before every push
pnpm lint         # eslint
pnpm db:generate  # versioned migration after schema.ts edits — COMMIT the drizzle/*.sql;
                  # deploys auto-apply pending migrations to prod (guarded, forward-only)
pnpm db:push      # local dev DBs ONLY — never push schema to prod by hand
pnpm db:studio    # Drizzle Studio (visual DB explorer)
pnpm test         # vitest unit tests
pnpm verify       # format check + lint + typecheck + CSS-var check + test — the pre-done gate (mirrors CI)

# deploy: merging to main deploys automatically — .github/workflows/deploy.yml calls
# loki's reusable selfhost-deploy workflow (waits for this commit's CI to go green).
# Manual fallback: builds standalone, rsyncs to the box, restarts the service, health-checks
scripts/hetzner/deploy.sh petvity   # run from the loki repo's scripts/hetzner/
```

**Before declaring any change done, run `pnpm verify`** (format check + lint +
typecheck + CSS-var check + test). It mirrors CI's hermetic gates, so green locally means green on `main`.
CI (`.github/workflows/ci.yml`) runs the same gates on every push and PR, plus
`pnpm build` — the build is now hermetic (the sitemap is `force-dynamic`, no
build-time DB) and gated, so a broken build can't reach `main`.

**After every deployment:** `deploy.sh` health-checks the service; confirm `petvity.orangecat.ch` returns 2xx.

**The liveness probe is `/api/healthz`, not `/api/health`.** `/api/health` is the
private prefix for health *metrics/records* — it is auth-guarded and always
redirects to `/login`, so it can never report healthy. Verify a deploy with:

```bash
curl -fsS https://petvity.orangecat.ch/api/healthz && echo "  ✓ live"
```

---

## Environment Variables

Production env lives in `.env.selfhost.local` on the box (sourced by the systemd unit).

### Set in production ✓
| Variable | Value |
|----------|-------|
| `DATABASE_URL` | self-hosted Postgres connection string (database `petvity`) |
| `NEXTAUTH_SECRET` | Set |
| `CRON_SECRET` | Set |
| `NEXT_PUBLIC_APP_URL` | https://petvity.orangecat.ch |
| `AUTH_URL` | https://petvity.orangecat.ch — **required**, see gotcha 9 |
| `AUTH_TRUST_HOST` | true |
| `RESEND_API_KEY` | Set — verified 2026-08-15, sending domain `loki.orangecat.ch` |
| `RESEND_FROM` | `Petvity <noreply@fleetcrown.orangecat.ch>` |
| `ADMIN_EMAILS` | Set |

### NOT YET configured (needed for full functionality)
| Variable | Where to get it | Impact if missing |
|----------|----------------|-------------------|
| `GOOGLE_CLIENT_ID` | Google Cloud Console | Google OAuth login disabled (no button is rendered, so no broken path is exposed) |
| `GOOGLE_CLIENT_SECRET` | Google Cloud Console | Google OAuth login disabled |
| `STRIPE_SECRET_KEY` | Stripe dashboard → API keys | Shop checkout records orders without payment (pay-off-platform mode; the UI says "Place order", never "Pay") |
| `STRIPE_WEBHOOK_SECRET` | Stripe dashboard → Webhooks (endpoint `/api/payments/webhook`, event `checkout.session.completed`) | Orders never flip to Paid even if Stripe is keyed |

Production env lives in `/opt/petvity/shared/.env` (`/opt/petvity/app/.env` is a
symlink to it, so edits survive deploys). Edit it on the box and restart with
`systemctl restart petvity-app`.

---

## Architecture

```
proxy.ts               → Middleware: auth-guard + locale routing (see routing rules below)

app/
  (auth)/              → NON-LOCALIZED auth pages: /login /register /forgot-password /reset-password
  (portal)/            → Auth-guarded portal (ALL routes must be under /portal/)
    layout.tsx         → Sidebar nav (desktop) + bottom nav (mobile) via SidebarNav client component
    dashboard/         → Pet grid with wellness signals
    pets/              → Pet list + CRUD
      new/             → Add pet form
      [petId]/         → Pet profile (hero header, section cards)
        edit/          → Edit pet + delete (PATCH/DELETE /api/pets/[petId])
        health/        → Metrics chart + history table
          log/         → Daily health log form
        records/       → Vet visit records
        vaccinations/  → Vaccination schedule
    checkin/           → Multi-pet daily check-in shortcut
    settings/          → Account settings (name + password)
    find/              → Browse vets + sitters, book via modal
    bookings/          → User's bookings + review modal
    shop/              → Product catalogue + cart + checkout
    orders/            → User's order history
    adopt/             → Browse adoption listings (public listings, no auth needed to browse)
      [listingId]/     → Listing detail + apply form (auth required to apply)
    adoptions/         → Owner's listings + applications management
    pets/[petId]/
      list-for-adoption/ → Create adoption listing for a pet
    professional-profile/ → Vet/sitter profile editor (role-gated)
  (admin)/admin/       → Admin area (role=admin only)
    users/             → User list + role management
    products/          → Product CRUD + stock management
    orders/            → Fulfillment workflow + revenue stats
    adoptions/         → Adoption listings moderation + status management
  [locale]/            → Localized marketing (en/de/fr/es/ja/zh/ko/tr/ar)
    (marketing)/       → features, about, pricing, species guides
    (public)/pets/[handle]/ → Public influencer pet profile (no auth, isPublic=true only)
    (public)/adopt/    → Public adoption browse (SSR, no auth)
      [listingId]/     → Listing detail + sign-up CTA
    (public)/pros/[userId]/ → Public vet/sitter profile
    (public)/shop/     → Public catalogue — add to cart without an account
      [productId]/     → Product detail + Add to cart
      checkout/        → Guest checkout: cart + email + address, one page
      order/[token]/   → Guest receipt, reached only by the emailed token
  api/
    auth/[...nextauth] → NextAuth (ALWAYS public — never auth-guard this)
    account/           → POST: registration, PATCH: update name/password (no auth on POST)
    pets/              → GET list, POST create
    pets/[petId]/      → GET, PATCH, DELETE (owner-scoped)
    pets/[petId]/avatar → POST: upload to local-disk storage (lib/storage.ts)
    health/metrics/[petId] → POST upsert daily health log
    health/records/    → Health records CRUD
    health/records/[recordId] → PATCH/DELETE (owner-scoped)
    vaccinations/      → Vaccination CRUD
    vaccinations/[vaccinationId] → PATCH/DELETE
    medications/       → Medication CRUD
    medications/[medicationId] → PATCH/DELETE
    vets/              → GET public vet list
    vets/me/           → GET/POST/PATCH own vet profile
    sitters/           → GET public sitter list
    sitters/me/        → GET/POST/PATCH own sitter profile
    bookings/          → GET list, POST create
    bookings/[bookingId] → PATCH status, DELETE
    reviews/           → POST (linked to completed booking)
    products/          → GET public list (active only); ?ids=a,b,c prices a guest cart
    products/[productId] → GET single product
    orders/            → GET user's orders, POST place order (account)
    orders/[orderId]   → PATCH status (user cancel pending; admin any transition)
    orders/[orderId]/pay → POST re-open Stripe Checkout (account orders)
    shop/checkout      → POST place order with NO account (public, rate limited)
    shop/order/[token] → PATCH cancel own pending guest order
    shop/order/[token]/pay → POST re-open Stripe Checkout for a guest order
                             (the unguessable token is the authorisation)
    adoptions/         → GET public available listings, POST create (auth)
    adoptions/[listingId] → GET public, PATCH/DELETE (owner or admin)
    adoptions/[listingId]/apply → POST (auth, one per user)
    adoptions/[listingId]/applications → GET (owner/admin), PATCH approve/reject
    public/pets/[handle] → Public pet data (no auth)
    admin/users/       → GET list, PATCH role
    admin/users/[userId] → PATCH (role change)
    admin/products/    → Full product CRUD + stock
    admin/orders/      → All orders with customer + items
    admin/adoptions/   → All listings with pet, owner, application counts
    admin/blog/        → GET list (drafts included), POST create
    admin/blog/[postId] → PATCH edit/publish/unpublish, DELETE
    admin/professionals/[userId] → PATCH verify/unverify
    cron/emails        → Process welcome email queue (Bearer CRON_SECRET)
    cron/health-alerts → Flag out-of-range metrics (Bearer CRON_SECRET)
    cron/vaccination-reminders → Remind about due vaccines (Bearer CRON_SECRET)
    cron/medication-reminders  → Remind about medication courses ending tomorrow (Bearer CRON_SECRET)
    cron/booking-reminders     → Remind about bookings starting tomorrow (Bearer CRON_SECRET)
    cron/weekly-digest         → Weekly wellness digest per owner (Bearer CRON_SECRET)

components/
  portal/
    SidebarNav.tsx     → Client component: sidebar (desktop) + top/bottom nav (mobile)

lib/
  db/schema.ts         → SSOT: ALL Drizzle table definitions
  db/index.ts          → Lazy Postgres singleton (node-postgres Pool, Proxy pattern — no eager connection)
  auth/index.ts        → NextAuth config (functional pattern — adapter called lazily)
  auth/edge.ts         → Edge-compatible auth config (no bcrypt/DB) — used by proxy.ts only
  auth/guards.ts       → requireSession() / requireRole() / requireAdmin()
  auth/types.ts        → Session type augmentation (adds id, role, emailVerified)
  config/
    species.ts         → SSOT: 10 species, breeds, emoji, lifespan, normal ranges
    health-metrics.ts  → SSOT: 7 KPIs, units, toDisplay/toStorage converters, normal ranges
    pet-signal.ts      → SSOT: signal thresholds, labels, Tailwind bg classes
    products.ts        → SSOT: 6 product categories, labels, PRODUCT_CATEGORY_OPTIONS
    orders.ts          → SSOT: order status + booking status labels and color classes
    adoptions.ts       → SSOT: adoption listing + application status labels and color classes
    users.ts           → SSOT: user role labels, badge colors, USER_ROLE_OPTIONS
    locales.ts         → SSOT: 9 locales, RTL_LOCALES list
    app.ts             → APP name, emails, URL (NEXT_PUBLIC_APP_URL)
    auth.ts            → BCRYPT_SALT_ROUNDS, PASSWORD_MIN_LENGTH
  domain/
    auth.ts            → loginSchema, registerSchema, resolveRole()
    pet-signal.ts      → computePetSignal() — pure, injected, unit-tested
    pet-signal.test.ts → vitest unit tests
    health.ts          → isMetricInRange(), computeWellnessScore()
    pets.ts            → createPetHandle(), validateSpeciesBreed()
    email-queue.ts     → enqueueWelcomeSequence()
  email/
    index.ts           → sendEmail() via Resend
    templates.ts       → All email templates (SSOT — never inline in API routes)
  utils/format.ts      → formatDateShort, formatWeight, formatTemperature
```

---

## Middleware Routing (`proxy.ts`) — CRITICAL RULES

```
1. /api/auth/*          → ALWAYS pass through (NextAuth must be public)
2. /portal, /admin (PORTAL_PREFIXES)
   + /api/pets, /api/health, /api/vaccinations, /api/medications,
     /api/vets, /api/sitters, /api/bookings, /api/reviews,
     /api/orders, /api/cron, /api/admin (PRIVATE_API_PREFIXES)
                        → Auth-guard only, no locale routing
                        → Unauthenticated → /login?returnTo=<path>
                        → Non-admin at /admin → /portal/dashboard
3. /login, /register, /forgot-password, /reset-password
                        → Bypass intl routing (serve non-localized)
                        → Already-logged-in → redirect to dashboard
4. /api/* (catch-all)   → Pass through, no locale routing (public API routes)
   Public routes (NOT in PRIVATE_API_PREFIXES — self-guard via requireSession()):
     /api/account (registration), /api/public/* (public profiles),
     /api/products (public browse), /api/adoptions (public browse + self-guarded writes),
     /api/shop/* (guest checkout — MUST stay public, see below),
     /api/auth/forgot-password, /api/auth/reset-password
5. Everything else      → next-intl locale routing (marketing site)
```

**CRITICAL:** `/api/shop/*` must never be added to `PRIVATE_API_PREFIXES`. It exists
precisely so a visitor can buy without an account; a session guard there silently
deletes guest checkout. It is not unguarded — it is rate limited per client, and
`/api/shop/order/[token]/pay` requires the order's unguessable `publicToken`.

**CRITICAL:** All portal routes MUST be under `/portal/`. Do NOT add individual paths to PORTAL_PREFIXES.

**CRITICAL:** `/api/auth` must remain before ALL other checks or NextAuth breaks.

**CRITICAL:** Adding a new private API route? Add its prefix to `PRIVATE_API_PREFIXES` in proxy.ts. Do NOT add `/api` as a blanket prefix — that would block public endpoints like registration.

---

## Database Schema

**Enums:** `blog_post_status` (draft|published), `user_role` (pet_owner|veterinarian|pet_sitter|admin), `species` (dog|cat|horse|bird|rabbit|guinea_pig|hamster|reptile|fish|other), `sex`, `health_record_type`, `vaccination_status`, `medication_status`, `email_queue_status`, `order_status`, `product_category`, `booking_status`, `adoption_listing_status`, `adoption_application_status`

**Tables:**
| Table | Key columns | Notes |
|-------|-------------|-------|
| `users` | id (uuid), email, password, name, role | name derived from email if not provided |
| `accounts` | NextAuth standard | |
| `sessions` | NextAuth standard | |
| `verificationTokens` | NextAuth standard | |
| `ownerProfiles` | userId, phone, city, country (ISO2), timezone, bio | |
| `pets` | id, ownerId, name, species, breed, birthDate, sex, weightGrams, bio, avatarUrl, isPublic, handle (unique), lastKnownSignal | |
| `healthMetrics` | petId, date, weightGrams, temperatureCentidegrees, heartRateBpm, energy/mood/anxiety/socialization (1–5) | UNIQUE(petId, date) |
| `healthRecords` | petId, type, title, date, vetName, clinic, notes | |
| `vaccinations` | petId, name, administeredDate, nextDueDate, status | |
| `medications` | petId, name, dosage, frequency, startDate, endDate, status | |
| `emailQueue` | userId, templateKey, sendAt, sentAt, status, payload (jsonb) | |
| `vetProfiles` | userId (unique), specialty, clinicName, clinicAddress, city, country, phone, bio, isVerified, isAcceptingClients | |
| `sitterProfiles` | userId (unique), bio, services (csv), pricePerDay (cents), city, country, phone, isVerified, isAcceptingClients | |
| `bookings` | id, petId, ownerId, professionalId, startDate, endDate, status, notes | |
| `reviews` | id, bookingId (unique), reviewerId, professionalId, rating (1–5), comment | |
| `products` | id, name, description, priceCents, stock, imageUrl, category, isActive | |
| `orderItems` | id, orderId, productId, quantity, priceCents | |
| `orders` | id, userId (nullable), guestEmail, publicToken (unique), totalCents, status, paidAt, checkoutSessionId, shipping*, notes | CHECK `orders_buyer_identity`: exactly one of userId / guestEmail. `publicToken` is the guest's only handle on their order |
| `adoptionListings` | id, petId, ownerId (denorm), status, title, description, feeCents (null=free), location, requiresExperience, goodWithKids/Dogs/Cats | |
| `adoptionApplications` | id, listingId, applicantId, status, message, experience, housingType | |
| `blogPosts` | id, slug (unique), title, excerpt, body, status, publishedAt | body is authoring markup, parsed at render |

**Numeric storage conventions (NEVER violate):**
- Weight: integer grams (3500 = 3.5 kg). Display: ÷ 1000. `toDisplay()` / `toStorage()` in health-metrics.ts.
- Temperature: integer centidegrees (3850 = 38.50°C). Display: ÷ 100.
- Emotional metrics: integer 1–5 (1=low, 5=high). Exception: anxiety is inverted (5=very anxious).
- Rationale: exact integer comparisons for alert thresholds, zero float drift.

---

## Pet Wellness Signal

`lib/domain/pet-signal.ts` → `computePetSignal()` — pure function, unit tested.

```
Input: { species, recentMetrics[], overdueVaccinations, now? }
Output: { signal: "healthy"|"watch"|"concern", reason: string, outOfRangeMetrics[] }

Algorithm:
1. No metrics logged in last 7 days → "watch"
2. Count out-of-range metrics vs species-specific normal ranges
3. ≥2 out-of-range → "concern"; ≥1 out-of-range → "watch"; else "healthy"
4. Any overdue vaccination → escalates signal by one level (healthy→watch, watch→concern)
```

**If you change `computePetSignal` you MUST update `lib/domain/pet-signal.test.ts`.**

---

## Auth & Role System

- **Credentials provider**: email/password with bcrypt (BCRYPT_SALT_ROUNDS=12)
- **Google OAuth**: configured in NextAuth but needs env vars set (GOOGLE_CLIENT_ID/SECRET)
- **Role resolution**: `ADMIN_EMAILS` env var → admin. All others → pet_owner. Vet/sitter set manually by admin (Phase 2).
- **Guards pattern** (same as the `vitareba` repo — the Vita clinic portal):
  ```typescript
  const { session, error } = await requireSession();
  if (error) return error;
  // session is guaranteed non-null here
  ```
- **Session augmentation**: `lib/auth/types.ts` adds `id` (uuid), `role: UserRole`, `emailVerified` to session.

---

## SSOT Rules

**2-file test:** Adding a species = `lib/config/species.ts` + schema migration only. More files → architecture is wrong.

| What | Where | NEVER in |
|------|-------|---------|
| Species, breeds, icons, lifespan | `lib/config/species.ts` | DB table, component |
| Health KPI defs, units, ranges | `lib/config/health-metrics.ts` | Component |
| Signal thresholds, labels, colors | `lib/config/pet-signal.ts` | Cron route, component |
| Product category labels, options, max qty per line | `lib/config/products.ts` | Component, zod schema |
| Order/booking status labels, colors | `lib/config/orders.ts` | Component |
| Country codes (names come from `Intl`) | `lib/config/countries.ts` | Component, messages/*.json |
| Order placement + order input schemas | `lib/domain/orders.ts` | API route (inline) |
| Guest cart contents | `lib/shop/cart.ts` (localStorage) | Component state |
| Adoption listing/application status labels, colors | `lib/config/adoptions.ts` | Component |
| User role labels, badge colors | `lib/config/users.ts` | Component |
| Health record type labels, colors | `lib/config/health-records.ts` | Component |
| Vaccination status labels, badge classes | `lib/config/vaccinations.ts` | Component |
| Medication status labels, badge classes | `lib/config/medications.ts` | Component |
| Locales, RTL flag | `lib/config/locales.ts` | next-intl config |
| App name, email, URL | `lib/config/app.ts` | Component |
| Portal paths (static + `petPath`/`petHealthLogPath`) | `lib/config/routes.ts` | Component, nav config (inline `"/portal/..."`) |
| Auth guards | `lib/auth/guards.ts` | Page component |
| Signal computation logic | `lib/domain/pet-signal.ts` | API route, cron |
| Email templates | `lib/email/templates.ts` | API route (inline) |
| Undeliverable recipient domains | `lib/config/email.ts` | Send call site |
| Blog authoring markup rules | `lib/domain/blog-markup.ts` | Post page (inline parsing) |
| Image upload limits + types | `lib/config/uploads.ts` | Upload route (inline consts) |
| Product sort ids | `lib/config/products.ts` | Shop page |

---

## Cron Jobs

All `/api/cron/*` routes require `Authorization: Bearer CRON_SECRET`.

> **Scheduling:** the app is self-hosted on the Hetzner box (behind Caddy), so
> there is no Vercel Cron. Every route below **is wired** to a systemd timer on
> the box (verified 2026-08-15, all returning HTTP 200) — the shared runner is
> `/opt/_appcron/run.sh <app> <port> <path> <method>`, which reads `CRON_SECRET`
> from the app's `.env` and curls with `-f` so a non-2xx fails the unit.
>
> Inspect: `systemctl list-timers --all | grep petvity`
> Logs: `sudo journalctl -u appcron-petvity-<name> --since -24h`

| Route | Schedule | Timer unit | Purpose |
|-------|----------|-----------|---------|
| `/api/cron/emails` | `0 7 * * *` | `appcron-petvity-emails` | Process welcome email queue |
| `/api/cron/health-alerts` | `0 8 * * *` | `appcron-petvity-health-alerts` | Flag out-of-range metrics, email owners |
| `/api/cron/vaccination-reminders` | `0 9 * * *` | `appcron-petvity-vaccination-reminders` | Remind about vaccines due in 30 days |
| `/api/cron/medication-reminders` | `0 10 * * *` | `appcron-petvity-medication-reminders` | Remind about medication courses ending tomorrow |
| `/api/cron/booking-reminders` | `0 11 * * *` | `appcron-petvity-booking-reminders` | Remind about bookings starting tomorrow |
| `/api/cron/weekly-digest` | `0 9 * * 0` | `appcron-petvity-weekly-digest` | Weekly wellness digest for all opted-in owners |
| `/api/cron/reset-demo` | every 2h | `petvity-cron-reset-demo` | Wipe + reseed the shared demo account (see gotcha 10) |
| `/api/cron/resident-checkin` | `30 6 * * *` | `petvity-cron-resident-checkin` | Daily metrics for the seeded demo residents |

---

## Phase Status

### Phase 1 — Complete ✓
- User auth (register/login/logout, forgot/reset password, credentials + Google OAuth shell)
- Species: dog, cat, horse, other — with breeds
- Health metrics logging (daily, upsert, with species-specific range hints)
- Pet wellness signal (healthy/watch/concern), cached to `lastKnownSignal` on log POST
- Digital Twin: emotional state (Thriving/Content/Attention/Struggling) with trend analysis
- Health charts (Recharts — 30-day trends for all 7 metrics, per-species normal range lines)
- Vaccination tracking (add + status badge)
- Health records (add, list with type icons)
- Medications (add, list with active/completed/discontinued status)
- Account settings (edit name, change password)
- Pet avatar upload (UI + API — local-disk storage via lib/storage.ts, served by Caddy under /uploads/*)
- Email queue (welcome sequence) + cron jobs (health alerts, vaccination reminders)
- Public pet profiles (`/[locale]/pets/[handle]`)
- 9-language i18n with RTL Arabic
- Portal UI (dashboard with twin mini-bars, pets CRUD, health log, check-in)
- Marketing site (homepage, /features, /about, /pricing)
- Species guides (`/[locale]/species/[dog|cat|horse]`)
- Sidebar nav + mobile bottom nav + admin panel

### Env vars still needed (user action — no code change required)
- [ ] `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` → Google Cloud Console → enables Google OAuth
      (nothing is broken without them — the login page renders no Google button)

### Phase 2 — Complete ✓
- Vet profiles (create/edit at `/portal/professional-profile`, public at `/[locale]/pros/[userId]`)
- Sitter profiles (same)
- Find a Pro page (`/portal/find`) with booking modal
- Bookings management (`/portal/bookings`) with status flow + review modal
- Reviews (POST `/api/reviews`, linked to completed booking, avg shown on pro card)
- Admin professional verification (`/api/admin/professionals/[userId]`)

### Phase 3 — Complete ✓
- Product catalogue (`/portal/shop`) with cart drawer + checkout
- Order history (`/portal/orders`)
- Admin products panel (`/admin/products`) — CRUD + stock management
- Admin orders panel (`/admin/orders`) — fulfillment workflow + revenue stats
- Transactional emails: order confirmation + status updates (via Resend)
- **Guest checkout** — buy from the public storefront with no account:
  add to cart on `/[locale]/shop` and the product page, one-page checkout at
  `/[locale]/shop/checkout`, receipt at `/[locale]/shop/order/[token]`.
  `placeOrder()` in `lib/domain/orders.ts` is the single implementation both
  the authed cart and the guest checkout call.

### Phase 4 — Complete ✓
- Adoption listings: owner creates at `/portal/pets/[petId]/list-for-adoption`, manages at `/portal/adoptions`
- Adoption applications: browser applies at `/portal/adopt/[listingId]`, owner approves/rejects
- Public browse: `/[locale]/adopt` + `/[locale]/adopt/[listingId]` (SSR, no auth)
- Admin moderation: `/admin/adoptions` — status management for all listings
- Transactional emails: application received (owner) + status change (applicant)

---

## Known Gotchas

1. **`/api/auth/*` must always be public** — NextAuth route. The middleware has an explicit early-return for this path. Never add `/api/auth` to any auth-guard list.

2. **Auth pages bypass intl routing** — `/login`, `/register` etc. live at non-localized paths `app/(auth)/`. They're excluded from next-intl in proxy.ts. If you add new auth pages, add them to `AUTH_PATHS` in `proxy.ts`.

3. **Lazy DB singleton** — `lib/db/index.ts` uses a Proxy to defer DB connection until first use. This prevents connection at build time. Always use `getInstance()` or the `db` proxy export, never instantiate `drizzle()` directly in a component/route.

4. **Functional NextAuth config** — `lib/auth/index.ts` uses `NextAuth(() => {...})` (function form) so the DrizzleAdapter is only called at runtime, not at module evaluation. Required to avoid build-time DB connection.

5. **Edge auth config** — `proxy.ts` imports from `lib/auth/edge.ts` (no bcrypt, no DB). Never import from `lib/auth/index.ts` in middleware.

6. **Weight/temperature are integers** — Always store as grams and centidegrees. `health-metrics.ts` has `toDisplay()` and `toStorage()` converters. Float storage will break alert threshold comparisons.

7. **Pet signal test must be updated** — Any change to `computePetSignal()` logic must be reflected in `lib/domain/pet-signal.test.ts`. Run `pnpm test` to verify.

8. **CRON_SECRET must not have trailing whitespace** — the cron caller compares it exactly. Use `printf` not `echo` when writing it into `.env.selfhost.local`.

9. **`AUTH_URL` must be set in prod, and `AUTH_TRUST_HOST` does not replace it.** Auth.js's Next adapter rewrites the request origin via `reqWithEnvURL()`, which is a no-op unless `AUTH_URL`/`NEXTAUTH_URL` is set. Without it every relative redirect resolves against `req.nextUrl.origin` — in a standalone server behind Caddy that is `localhost:$PORT`, so **`signOut({ callbackUrl: "/login" })` sent every user to `https://localhost:4013/login`**, a dead page. Env lives in `/opt/petvity/shared/.env` (`app/.env` is a symlink to it, so edits survive deploys). Guarded by the "sign-out returns to the site" check in `scripts/e2e-walkthrough.sh`.

10. **The demo account's id is pinned, deliberately.** `/api/cron/reset-demo` deletes the user row so the FK graph cascades the wipe; letting the id regenerate re-minted the identity every 2 hours while 30-day sessions still pointed at the old one, so the demo silently read as an empty product. See `DEMO_ACCOUNT.id` in `lib/config/demo.ts`.

11. **Test accounts are real users, so they get real email — suppress it.** The
    e2e walkthrough and the smoke timer create ~20 accounts per run at
    `petvity.orangecat.ch`, which serves HTTP and has no MX. Every welcome /
    booking / order / reset mail to them hard-bounced: 79 of the last 100 sends
    (80%) on 2026-08-15, against an SES suspension threshold near 5%, on an API
    key shared with the rest of the fleet — and a real tester mailbox had
    already been pushed onto the suppression list. `sendEmail()` now drops
    recipients at structurally undeliverable domains; the list is SSOT in
    `lib/config/email.ts`. **Any new fixture must use one of those domains or an
    RFC 2606 TLD (`.invalid`, `.test`), never a live mailbox.**

12. **`orders.userId` is nullable — never `innerJoin` it to `users`.** A guest
    order has no `users` row, so an inner join drops it from the result set
    entirely: the seller and admin order views would silently stop showing the
    orders that actually need shipping, and nothing would look broken. Use
    `leftJoin` plus `COALESCE(users.name, orders.shippingName)` /
    `COALESCE(users.email, orders.guestEmail)` — the address the buyer typed at
    checkout is the fallback identity. Both `app/api/orders/seller/route.ts` and
    `app/api/admin/orders/route.ts` do this; copy that shape for any new query
    that reads an order's buyer. The same applies to code: `order.userId` is
    `string | null`, and a null one means "email them at `guestEmail`".

13. **A guest's only handle on their order is `orders.publicToken`.** They have
    no session and appear in no list, so if that uuid is lost the order is
    unreachable — it is emailed on the receipt and used as the authorisation for
    `/api/shop/order/[token]/pay`. Hence the receipt page is `noindex`,
    `no-referrer`, and answers 404 for an unknown token rather than
    distinguishing "wrong token" from "no such order".

---

## Red Flags

- Species or breed hardcoded in a component → move to `lib/config/species.ts`
- Health metric unit/range hardcoded → move to `lib/config/health-metrics.ts`
- `ml-*`/`mr-*`/`pl-*`/`pr-*` Tailwind classes → use logical props `ms-*`/`me-*`/`ps-*`/`pe-*`
- New portal route not under `/portal/` → breaks middleware, unauthenticated users get 404
- Signal threshold in a cron route → `lib/config/pet-signal.ts`
- Email template inline in an API route → `lib/email/templates.ts`
- Weight stored as float → always integer grams
- Temperature stored as float → always integer centidegrees
- `computePetSignal` changed without updating tests
- Importing `lib/auth/index.ts` in middleware → use `lib/auth/edge.ts`
- Any `/api/auth/*` route behind auth guard → NextAuth breaks entirely
- A test fixture using a live mailbox → bounces burn the shared sending reputation; use a domain from `lib/config/email.ts`
- `innerJoin(users, eq(users.id, orders.userId))` → hides every guest order; use `leftJoin` + `COALESCE`
- Order placement logic written in an API route → `placeOrder()` in `lib/domain/orders.ts`
- A message key added to `messages/en.json` only → all 9 locales must carry it (enforced by `lib/i18n/message-keys.test.ts`)
- A "Sign up to buy" CTA on a public product → the storefront sells without an account now
- A `"/portal/..."` literal in a component → `lib/config/routes.ts` (enforced by `lib/config/routes.test.ts`)
