<!-- fleet:rules:begin — generated from bitbaum/fleet templates/agent-rules.md; edit it there, not here -->

## Org rules

Read `bitbaum/fleet` `AGENTS.md`, `SHARED.md` and the registers it names before
inventing a host, a name, a page or a shared behaviour. Do not copy their facts
into this file.

- **Packages first.** If a `@bitbaum/*` package (or `bip-kit`, `limitkit`,
  `threadkit`, `ai-forms`) already does it, use it and fix a defect in the
  package, not in this app. Every chat is `@bitbaum/chatkit`, every search box
  `@bitbaum/searchkit`, every chart `@bitbaum/chartkit`, accounts
  `@bitbaum/accountkit`, model calls `@bitbaum/ai-kit`. Review this product's
  `package-plan.json` before building anything. When a second product needs
  what one product built (a map, a globe, a calculator), extract it into a
  package before writing the second copy.
- **A gap is a task, not an answer.** Never end the work, or a reply, at "not
  supported" or "not available". When a source cannot be read or a case does
  not fit the model, find another way (another format or publisher, the
  official tool measured, the model extended) and do it. What truly cannot be
  done yet is tracked with its plan, never presented as a limit of the product.
- **Every page leads to an action.** What a reader learns, they can act on
  from the same screen: file, pay, apply, compare, ask, contact.
- **One shape per kind.** Things of the same kind look the same and sit in the
  same place (fleet `AGENTS.md`, "One shape per kind").
- **Finished work ships by itself.** Open a non-draft pull request; the fleet
  auto-merge sweep is the only merge path. Never merge by hand, through the
  merge API, with `--auto` or with an admin bypass, and never force-push a
  shared branch.
- **Nothing made up.** A fact on a page or in a doc needs a source that was
  opened; where there is none, the line is removed or softened. A gap is
  filled with sourced data, never with a guess.
- **Bitcoin orange is for Bitcoin and top-of-funnel actions only.**
- **No model identifier** in anything pushed to a repository.
- Before you finish, run `node <fleet>/scripts/ci/docs-truth-audit.mjs --dir .`:
  the same check the sweep runs on every pull request.

<!-- fleet:rules:end -->

<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know


This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## What this is

Petvity gives pet owners one place to monitor their pet's daily wellness,
connect with local vets, sitters and groomers, and manage the whole care
journey — health logs, vaccinations, medications, a shop and cross-border
adoption. Success means any owner can check their pet's signal in seconds,
understand why it changed, and act without leaving the platform. Pets can have
public profiles. Plans and history: `ROADMAP.md`, `CHANGELOG.md`.

- Production: https://petvity.orangecat.ch — self-hosted on the Hetzner box
  `bitbaum`, service `petvity-app` on port 4013 behind Caddy, PostgreSQL 17
  database `petvity` on the same box.
- Stack: Next.js 16 (App Router, standalone) · TypeScript strict · Tailwind v4 ·
  Drizzle (`node-postgres`) · NextAuth 5 · Resend · local-disk uploads
  (`lib/storage.ts`, served by Caddy under `/uploads/*`) · next-intl with 9
  locales (EN DE FR ES JA ZH KO TR AR; AR is RTL) · `@bitbaum/chartkit` · Zod.

## Commands

```bash
pnpm dev          # local dev (localhost:3000)
pnpm build        # production build
pnpm db:generate  # versioned migration after schema.ts edits — COMMIT the drizzle/*.sql;
                  # deploys auto-apply pending migrations to prod (guarded, forward-only)
pnpm db:push      # local dev DBs ONLY — never push schema to prod by hand
pnpm db:studio    # Drizzle Studio
pnpm test         # vitest
pnpm verify       # format check + lint + typecheck + CSS-var check + test — the pre-done gate (mirrors CI)
```

CI (`.github/workflows/ci.yml`) runs `verify` plus `pnpm build`; the build is
hermetic (the sitemap is `force-dynamic`, no build-time DB). `.github/workflows/browser-smoke.yml`
runs `pnpm browser:journey` (`scripts/ci/account-journey.mjs`) in Chromium
against the build and a throwaway Postgres built from the committed
migrations (`scripts/ci/migrations-replay.sh`, which also fails when they
no longer match `lib/db/schema.ts`): register, sign out, wrong password
refused, sign in, and no Google button without a `GOOGLE_*` pair. Merging to `main`
deploys: `.github/workflows/deploy.yml` calls loki's reusable selfhost-deploy
workflow once this commit's CI is green. Manual fallback, from the loki repo:
`scripts/hetzner/deploy.sh petvity`.

**The liveness probe is `/api/healthz`, not `/api/health`.** `/api/health` is
the private prefix for health *records*; it is auth-guarded and always
redirects to `/login`.

```bash
curl -fsS https://petvity.orangecat.ch/api/healthz && echo "  ✓ live"
```

## Environment

Production env lives in `/opt/petvity/shared/.env` (`/opt/petvity/app/.env` is
a symlink to it, so edits survive deploys); restart with
`systemctl restart petvity-app`. Required: `DATABASE_URL`, `NEXTAUTH_SECRET`,
`CRON_SECRET` (no trailing whitespace — write it with `printf`, not `echo`),
`NEXT_PUBLIC_APP_URL`, `AUTH_URL`, `AUTH_TRUST_HOST`, `RESEND_API_KEY`,
`RESEND_FROM`, `ADMIN_EMAILS`. Optional, each degrading cleanly when absent:

| Variable | Without it |
| --- | --- |
| `ORANGECAT_OAUTH_CLIENT_ID` / `_SECRET` (redirect `https://petvity.orangecat.ch/api/auth/callback/orangecat`), `ORANGECAT_OAUTH_ISSUER` (default `https://orangecat.ch`) | no "Sign in with OrangeCat"; email + password only |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | no Google button is rendered |
| `STRIPE_SECRET_KEY` | orders are recorded without payment; the UI says "Place order", never "Pay" |
| `STRIPE_WEBHOOK_SECRET` (endpoint `/api/payments/webhook`, `checkout.session.completed`) | orders never flip to Paid |

## Layout

- `proxy.ts` — middleware: auth guard + locale routing (rules below).
- `app/(auth)/` — non-localized auth pages. `app/(portal)/portal/` — the
  signed-in app (every portal route lives under `/portal/`).
  `app/(admin)/admin/` — admin only. `app/[locale]/` — localized marketing and
  public pages (pet profiles, adoption browse, pro profiles, the public shop
  with guest checkout). `app/api/` — route handlers; `app/api/cron/*` the jobs.
- `lib/db/schema.ts` — SSOT for every table and enum. `lib/db/index.ts` — lazy
  Postgres singleton (a Proxy; no connection at build time).
- `lib/auth/index.ts` — NextAuth in function form (adapter called lazily),
  including the OrangeCat provider. `lib/auth/edge.ts` — the edge config
  `proxy.ts` uses (no bcrypt, no DB). `lib/auth/guards.ts` —
  `requireSession()` / `requireRole()` / `requireAdmin()`.
- `lib/config/` — labels, options, thresholds, routes (table below).
  `lib/domain/` — pure logic. `lib/email/templates.ts` — every email template.

## Routing rules (`proxy.ts`)

1. `/api/auth/*` passes through before every other check — NextAuth must stay public.
2. `PORTAL_PREFIXES` (`/portal`, `/admin`) and `PRIVATE_API_PREFIXES` are
   auth-guarded with no locale routing; unauthenticated → `/login?returnTo=…`,
   non-admin at `/admin` → `/portal/dashboard`. A new private API route adds
   its prefix to `PRIVATE_API_PREFIXES`; never add `/api` as a blanket prefix,
   and never add a portal path one by one — put it under `/portal/`.
3. `AUTH_PATHS` bypass intl routing; a signed-in visitor is sent to the dashboard.
   A new auth page is added there.
4. Other `/api/*` pass through and guard themselves with `requireSession()`
   (registration, public profiles, products, adoptions, password recovery).
   **`/api/shop/*` must never become private** — it is guest checkout. It is
   rate limited, and `/api/shop/order/[token]/pay` is authorised by the order's
   unguessable `publicToken`.
5. Everything else gets next-intl locale routing.

Password recovery screens are the shared `PasswordRecoveryForm` from
`@bitbaum/accountkit/auth/react`, reached through `lib/auth/recovery-client.ts`;
fix a form defect in bitbaum/accountkit, not here.

## Data conventions

- Weight is integer grams, temperature integer centidegrees, emotional metrics
  integers 1–5 (anxiety inverted: 5 = very anxious). Convert with `toDisplay()` /
  `toStorage()` in `lib/config/health-metrics.ts`; a float breaks the alert
  threshold comparisons.
- `orders.userId` is nullable: a guest order has `guestEmail` and
  `publicToken` instead (CHECK `orders_buyer_identity`). **Never `innerJoin`
  orders to users** — it silently drops guest orders. Use `leftJoin` plus
  `COALESCE(users.name, orders.shippingName)` /
  `COALESCE(users.email, orders.guestEmail)`, as
  `app/api/orders/seller/route.ts` and `app/api/admin/orders/route.ts` do.
- A guest's only handle on an order is `publicToken`, emailed on the receipt;
  the receipt page is `noindex`, `no-referrer`, and answers 404 for any unknown
  token.
- `placeOrder()` in `lib/domain/orders.ts` is the one order implementation, for
  the signed-in cart and guest checkout alike.

## Pet wellness signal

`computePetSignal()` in `lib/domain/pet-signal.ts` is pure and unit-tested; any
change updates `lib/domain/pet-signal.test.ts`. A new pet with nothing overdue
inside the alert window is healthy; no recent check-in is "watch"; out-of-range
metrics against the species' normal ranges raise it to "watch" or "concern"; an
overdue vaccination escalates it. Thresholds live in `lib/config/pet-signal.ts`.
The result is cached to `pets.lastKnownSignal` when a log is posted.

## Auth and roles

- **Sign in with OrangeCat** is the primary path (OIDC, `client_secret_post` +
  PKCE + state). A user is keyed only on `users.orangecat_sub` — **never linked
  by email** (OrangeCat's `email_verified` cannot be trusted; linking would be
  account takeover), and an OrangeCat login never earns `ADMIN_EMAILS`
  promotion. A taken email gets a `@users.invalid` placeholder.
- Credentials: bcrypt passwords. The password rule is
  `@bitbaum/accountkit/auth/password` (`MIN_PASSWORD_LENGTH`,
  `MAX_PASSWORD_LENGTH`, `passwordProblem`); never add a local minimum,
  strength check or hint.
- Roles are `userRoleEnum` in `lib/db/schema.ts`: `ADMIN_EMAILS` → admin,
  everyone else starts as `pet_owner`; professional roles are set by an admin.
- Route guards: `const { session, error } = await requireSession(); if (error) return error;`.
  `lib/auth/types.ts` adds `id`, `role` and `emailVerified` to the session.
- `AUTH_URL` must be set in prod; `AUTH_TRUST_HOST` does not replace it.
  Without it Auth.js resolves relative redirects against `localhost:$PORT`
  behind Caddy, and sign-out once sent every user to `https://localhost:4013/login`.
  `scripts/e2e-walkthrough.sh` checks sign-out returns to the site.

## Where things live

Adding a species is `lib/config/species.ts` plus a migration; more files means
the architecture is wrong.

| What | Where |
| --- | --- |
| Species, breeds, icons, lifespan, normal ranges | `lib/config/species.ts` |
| Health KPIs, units, converters | `lib/config/health-metrics.ts` |
| Signal thresholds, labels, colours | `lib/config/pet-signal.ts` |
| Product categories, sort ids, max quantity per line | `lib/config/products.ts` |
| Order and booking statuses | `lib/config/orders.ts` |
| Adoption statuses | `lib/config/adoptions.ts` |
| Health record types, vaccination and medication statuses | `lib/config/health-records.ts`, `vaccinations.ts`, `medications.ts` |
| User role labels | `lib/config/users.ts` |
| Country codes (names from `Intl`) | `lib/config/countries.ts` |
| Locales and RTL | `lib/config/locales.ts` |
| App name, emails, URL | `lib/config/app.ts` |
| Portal paths (`petPath`, `petHealthLogPath`) — no `"/portal/..."` literal in a component | `lib/config/routes.ts` (enforced by `routes.test.ts`) |
| Undeliverable recipient domains | `lib/config/email.ts` |
| Upload limits and types | `lib/config/uploads.ts` |
| Order placement and input schemas | `lib/domain/orders.ts` |
| Guest cart | `lib/shop/cart.ts` (localStorage) |
| Blog long-form parsing | `lib/domain/longform.ts` |
| Email templates | `lib/email/templates.ts` |

A message key goes into all 9 `messages/*.json` files
(`lib/i18n/message-keys.test.ts`). RTL needs logical utilities only (`ms-*`,
`ps-*`, never `ml-*`, `pl-*`).

## Cron

Every `/api/cron/*` route requires `Authorization: Bearer CRON_SECRET`. Each is
a systemd timer on the box through the shared runner
`/opt/_appcron/run.sh <app> <port> <path> <method>`, which curls with `-f` so a
non-2xx fails the unit. Inspect with `systemctl list-timers --all | grep petvity`
and `sudo journalctl -u appcron-petvity-<name> --since -24h`.

| Route | Schedule | Purpose |
| --- | --- | --- |
| `/api/cron/emails` | `0 7 * * *` | welcome email queue |
| `/api/cron/health-alerts` | `0 8 * * *` | out-of-range metrics, email owners |
| `/api/cron/vaccination-reminders` | `0 9 * * *` | vaccines due in 30 days |
| `/api/cron/medication-reminders` | `0 10 * * *` | medication courses ending tomorrow |
| `/api/cron/booking-reminders` | `0 11 * * *` | bookings starting tomorrow |
| `/api/cron/weekly-digest` | `0 9 * * 0` | weekly wellness digest |
| `/api/cron/reset-demo` | every 2h | wipe and reseed the shared demo account |
| `/api/cron/resident-checkin` | `30 6 * * *` | daily metrics for the seeded demo residents |

## Gotchas

- **The demo account's id is pinned** (`DEMO_ACCOUNT.id` in
  `lib/config/demo.ts`). The reset deletes the user row so the FK graph cascades;
  a regenerated id left 30-day sessions pointing at an empty account.
- **Test accounts are real users and get real email.** Fixtures must use a
  domain from `lib/config/email.ts` or an RFC 2606 TLD (`.invalid`, `.test`),
  never a live mailbox: bounces burn the sending reputation shared with the
  rest of the fleet. `sendEmail()` drops the structurally undeliverable ones.
- Never import `lib/auth/index.ts` from middleware; use `lib/auth/edge.ts`.
- Never instantiate `drizzle()` in a component or route; use the `db` export.
- The public product page sells without an account — no "Sign up to buy" CTA.

## Design System

**Tailwind version:** v4. No `tailwind.config.*` file exists — Tailwind is loaded via `@import "tailwindcss"` in `app/globals.css`. There is no `@theme` block. All design tokens are `:root` CSS custom properties in `globals.css`. Do not create a `tailwind.config.*` file. Arbitrary Tailwind values or `style={{}}` must be avoided — use semantic CSS classes defined in `globals.css` instead.

**JS token file:** `lib/config/design-tokens.ts` exports `TOKENS` (a `const` object) with hex values mirroring `globals.css` — for use in JS rendering contexts that cannot read CSS vars (Satori OG images). Values must stay in sync with `globals.css` manually — it is NOT auto-derived. Do NOT use `TOKENS` in JSX classNames.

### CSS Custom Properties (`app/globals.css` `:root`)

**Brand — deep forest teal:**
```
--teal:       #0D6E78    Brand (nav, links, focus rings, active states)
--teal-dark:  #0A5860    Brand hover
--teal-light: #E3F4F6    Brand backgrounds, hover fills
--teal-mid:   #B2DDE2    Eyebrow badge border, teal mid-tint
--teal-wash:  #f0fafb    Hero gradient endpoint
```

**Accent — warm terracotta (all primary CTAs):**
```
--accent:       #B8502A    Primary action buttons (WCAG AA 4.5:1 on white)
--accent-dark:  #9E4220    Accent hover
--accent-light: #FEF0E8    Accent backgrounds
```

**Text:**
```
--ink:   #1C1917    Primary text (warm charcoal)
--ink2:  #44403C    Secondary text
--muted: #78716C    Placeholder/helper text
--faint: #C4BBB3    Disabled/decorative
```

**Backgrounds:**
```
--off:    #FAF8F5    Page background (warm cream)
--light:  #F0EBE3    Light section backgrounds
--card:   #FFFFFF    Card background
--border: #E8E2D9    Default border
--border-hover: #d4cdc5    Hovered border
--off-bg: var(--off)        Legacy alias for --off
```

**State colors:**
```
--green:        #16A34A    Healthy signal, success text
--green-bg:     #DCFCE7    Success badge/alert background
--green-text:   #166534    Success text on --green-bg (WCAG AA)
--green-border: #bbf7d0    Success card borders
--warn:         #D97706    Watch signal, warning text
--warn-bg:      #FEF3C7    Warning badge/alert background
--warn-text:    #92400E    Warning text on --warn-bg (WCAG AA)
--warn-border:  #fde68a    Warning card borders
--danger:       #DC2626    Concern signal, error text
--danger-bg:    #FEE2E2    Error badge/alert background
--danger-text:  #991B1B    Error text on --danger-bg (WCAG AA)
--danger-dark:  #B91C1C    Danger hover
--danger-border:#fca5a5    Error card borders
```

**Role badge colors:**
```
--role-vet-bg:    #EFF6FF    --role-vet:    #1D4ED8
--role-sitter-bg: #FFFBEB    --role-sitter: #92400E
--role-admin-bg:  #F3E8FF    --role-admin:  #6B21A8
```

**Secondary palette (sitter / feminine brand):**
```
--secondary:      #EC4899
--secondary-dark: #BE185D
--secondary-bg:   #FDF2F8
```

**Info palette:**
```
--info:    #2563EB
--info-bg: #EFF6FF
```

**Digital twin identity:**
```
--twin:    #7C3AED
--twin-bg: #EDE9FE
```

**Warm bg/text (decorative icon backgrounds):**
```
--warm-bg:   #FFFBEB
--warm-text: #B45309
```

**Star rating:**
```
--star: #FBBF24
```

**Shadows:**
```
--shadow-sm:        0 1px 3px 0 rgb(0 0 0 / 0.05), 0 1px 2px -1px rgb(0 0 0 / 0.05)
--shadow-md:        0 4px 16px 0 rgb(0 0 0 / 0.07), 0 2px 6px -2px rgb(0 0 0 / 0.05)
--shadow-lg:        0 12px 40px 0 rgb(0 0 0 / 0.10), 0 4px 12px -4px rgb(0 0 0 / 0.06)
--brand-shadow:     0 4px 12px rgb(13 110 120 / 0.25)
--secondary-shadow: 0 4px 12px rgb(236 72 153 / 0.25)
--cta-shadow:       0 4px 20px rgb(0 0 0 / 0.15)
--tooltip-shadow:   0 2px 8px rgb(0 0 0 / 0.08)
```

**Obsidian luxury layer (marketing surface only — homepage + `(marketing)` pages, nav, footer):**
```
--obsidian:      #08080A    Marketing page ground (near-black, warm bias)
--obsidian-deep: #050506    Deepest band (final CTA, footer)
--carbon:        #0F0F13    Raised section surface
--onyx:          #131318    Card surface on dark (.lux-card)
--hairline:      #26262C    Borders on dark
--hairline-soft: #1B1B20    Subtle dividers on dark
--platinum:      #ECE9E2    Primary text on dark
--platinum-dim:  #B6B3AC    Secondary text on dark
--mist-dark:     #86847E    Muted text on dark
--champagne:        #C9B586    Accent — champagne gold (CTAs, eyebrows, emphasis)
--champagne-bright: #E3D2A9    Accent hover
--champagne-dim:    #8F7F5B    Subdued accent, borders
--danger-soft:   #F0A8A8    Danger-tinted text legible on dark
```
Classes: `.lux-hero` (aurora + grid ground), `.lux-section` / `.lux-section-raised` / `.lux-section-deep`,
`.lux-card` + `.lux-card-hover`, `.lux-chip`, `.display-title` / `.ed-title` / `.ed-title-sm` (Jost 200,
`em` renders champagne), `.ed-eyebrow` (IBM Plex Mono, tracked uppercase champagne), `.btn-editorial`
(champagne pill), `.btn-editorial-ghost(-sm)`, `.btn-editorial-light`, `.btn-editorial-sm`, `.ed-num`,
`.ed-icon`, `.lux-rise` (hero entrance, reduced-motion-safe). The portal/admin product UI stays on the
light teal/terracotta palette — never mix the two surfaces.

### Semantic CSS Classes (defined in `globals.css` — use these, not arbitrary Tailwind values)

**Layout:**
- `.section-inner` — max-width 1100px, centered, 24px side padding

**Cards:**
- `.card` — white card, `--border` border, 16px radius, `--shadow-sm`
- `.card-hover` — hover: `--shadow-md` + `--border-hover`

**Buttons:**
- `.btn-primary` — terracotta fill (`--accent`), white text, 10px radius
- `.btn-outline` — transparent, `--ink2` text, `--border` border, hover: teal tint
- `.btn-ghost` — transparent, `--muted` text, hover: `--light` bg
- `.btn-on-teal` — white fill on teal backgrounds, `--teal` text
- `.btn-on-teal-ghost` — white/10 fill on teal backgrounds, white text

**Forms:**
- `.form-input` — full-width input, 10px radius, teal focus ring (`--teal-light`)

**Signal badges:**
- `.signal-healthy` — `--green-bg` / `--green-text` pill
- `.signal-watch` — `--warn-bg` / `--warn-text` pill
- `.signal-concern` — `--danger-bg` / `--danger-text` pill

**Alerts:**
- `.alert-error` — `--danger-bg` / `--danger-text`
- `.alert-success` — `--green-bg` / `--green-text`

**Navigation:**
- `.nav-link` — base nav link (flex, 12px radius)
- `.nav-link-active` — `--teal-light` bg, `--teal` text
- `.nav-link-inactive` — `--ink2`, hover: `--light` bg + `--ink` text
- `.nav-link-muted` — `--muted`, hover: `--light` bg
- `.nav-link-danger` — `--muted`, hover: `--danger-bg` + `--danger-text`
- `.mobile-tab-item` / `.mobile-tab-item-active` / `.mobile-tab-item-inactive`

**Other:**
- `.eyebrow-badge` — teal pill for hero eyebrow labels
- `.prose-legal` — styled legal/terms/privacy long-form content

### Navigation Pattern

- Desktop: fixed 240px left sidebar (`components/portal/SidebarNav.tsx` — client component)
- Mobile: fixed top bar (h-14) + fixed bottom tab bar
- Portal layout offsets: `lg:ps-60 pt-14 lg:pt-0 pb-20 lg:pb-0`

### Typography

Declared once in `lib/fonts.ts` via `next/font/local`, from `.woff2` files vendored
in `lib/font-files/` (latin subset only — non-latin locales use system fallbacks, as
before). They are **not** fetched from Google at build time: that made every CI run
and deploy depend on `fonts.gstatic.com` being reachable, which failed twice in one
week and blocked a merge each time.

To add or refresh a weight: edit `scripts/fetch-fonts.mjs`, run `node scripts/fetch-fonts.mjs`,
commit the `.woff2`. Never wire it into the build — that reintroduces the network dependency.

- `--font-sans`: Plus Jakarta Sans, variable 400–800 — body everywhere.
- `--font-display`: Jost, variable 200–400 — marketing headlines (`.display-title`, `.ed-title*`).
- `--font-mono`: IBM Plex Mono 400/500 (static) — marketing eyebrows and instrument-style labels.

### RTL Support

Arabic only. `app/[locale]/layout.tsx` injects `dir="rtl"`. Use logical Tailwind props: `ms-*`, `me-*`, `ps-*`, `pe-*`. NEVER `ml-*`, `mr-*`, `pl-*`, `pr-*`. Use `.flip-rtl` for icons needing mirror.

### Utility overrides on semantic classes DO NOT WORK

The semantic classes in `globals.css` are **unlayered** CSS; Tailwind v4 puts
utilities in `@layer utilities`, and unlayered CSS beats every layer. So a
utility next to a semantic class (`form-input ps-9`, `btn-primary py-2`) is
**silently dead** whenever both set the same property. Wrapping the semantic
rules in `@layer components` does NOT help — the v4/Turbopack pipeline strips
author `@layer` blocks. When a variant of a semantic class is needed, add a
semantic modifier class in `globals.css` (e.g. `.form-input-icon` reserves
space for a leading icon) instead of a utility override.

### SSOT Rule

All design tokens live in `app/globals.css` only. There is no `tailwind.config.*` (Tailwind v4); if one ever existed it MUST reference CSS vars (`'var(--name)'`), never literal values. Components MUST use semantic CSS classes from `globals.css` or standard Tailwind utilities, never arbitrary values like `bg-[#hex]`.

**Violations to fix when touching UI:**
- `bg-[#hex]` / `text-[#hex]` in className → CSS var + semantic class
- `style={{ color: '#hex' }}` → CSS var + className
- Literal hex in a tailwind config → `'var(--color-name)'`
- Same token defined in 2+ files → consolidate to globals.css
- Hex values in `lib/config/design-tokens.ts` diverging from `globals.css` → sync them

**Audit:** `grep -r '\[#' src/` — every result is a violation.
