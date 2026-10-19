# Six shops in a month, an hour each

**Date:** 2026-08-16
**Scope:** fleet-wide. Belongs next to `dotfiles/SHARED.md`; it is here because
that is where the session had write access.

---

## Where the time actually goes today

Measured against what building Petvity's shop and reading evig's actually took,
not estimated from feel.

| Step | Today | With the system |
|---|---|---|
| Repo, Next scaffold, TS, lint, CI | 1–2 h | 2 min |
| Auth: NextAuth, schema, pages, guards | 3–4 h | 0 |
| Design tokens + component vocabulary | 4–8 h | 5 min (pick a palette) |
| i18n scaffolding | 2–3 h | 0 |
| Catalogue schema + admin CRUD | 6–10 h | 10 min (declare fields) |
| Cart, checkout, guest identity | 8–16 h | 0 |
| Payments + webhook | 2–4 h | 5 min (keys) |
| Transactional email | 2–3 h | 0 |
| Legal pages, SEO, sitemap, OG | 2–3 h | 5 min |
| Provisioning, deploy, TLS | 1–2 h | 5 min |
| **Total** | **30–55 h** | **~40 min** |

The hour is achievable. It is achievable because **roughly 90% of a shop is
identical between shops**, and the 10% that differs is nearly always the same
10%: what a product *is*, what the brand looks like, and who ships it.

---

## The architecture, and the one rule that matters

Three layers. The middle one does not exist yet and is the whole job.

```
  shop.config.ts        per shop   catalogue shape, brand, currency, fulfilment
  ─────────────────
  storefront kernel     MISSING    schema, routes, admin, checkout UI, emails
  ─────────────────
  commercekit           EXISTS     money, cart, inventory, buyer, addresses
```

### The rule: the kernel is a dependency, never a template

This is the single most important decision, and it is settled by your own
measured data rather than by preference. From `SHARED.md`:

> `auto-merge-sweep.sh` lives in **22 repos**, and as of 2026-08-16 in **8
> distinct versions** spanning 11,787–19,344 bytes. A fix landed in one reaches
> at most 9 of them.

A starter template that gets copied six times becomes six codebases within a
quarter. A fix to the checkout then has to be applied six times, and won't be.
The whole economic argument for doing this collapses at exactly the moment it
should be paying off.

So: **almost nothing is copied.** A new shop is three files —
`shop.config.ts`, a brand token file, and content — plus a dependency on a
versioned kernel. Upgrading six shops is six `npm update`s, and a breaking
change is visible in one place.

The corollary is uncomfortable and worth stating: the kernel must be genuinely
good, because six shops inherit its bugs. That is an argument for building it
slowly by extraction, not quickly by anticipation.

### The config, concretely

The catalogue is where shops actually differ, and it reconciles into a
declarative shape. Checked against the three real ones:

- **petvity**: name, description, price, stock, image, category, seller
- **evig**: title, description, price, category, **condition, brand, model,
  delivery options, pickup location**
- **fitfoot**: title, description, price, **size, colour** (variants)

That is a common core plus per-shop custom fields, which is exactly a
declarative schema:

```ts
export default defineShop({
  currency: "CHF",
  catalogue: {
    fields: {
      condition: { type: "choice", options: ["new", "good", "fair"], facet: true },
      brand:     { type: "text", facet: true },
    },
    variants: ["size", "colour"],
  },
  fulfilment: "own-stock",     // | "dropship" | "digital" | "p2p"
  payments:   "stripe",
  brand:      brandTokens,
});
```

Everything else — product admin, faceted browse, cart, guest checkout, order
lifecycle, seller notifications, receipts — is generated from that.

---

## What already exists (do not rebuild it)

The infrastructure half is genuinely solved, which is why the hour is realistic:

- **Provisioning** — `loki/scripts/hetzner/apps.conf` is a manifest
  (`name|port|domains|repo|app_dir|db`) and `sync-infra.sh` generates the
  systemd unit, launch script and Caddy vhost from it, idempotently. Adding an
  app is one line and one command. 13 apps run this way today.
- **Deploy** — `deploy.sh`, push-to-main, health check.
- **CI** — `dotfiles/templates/ci`, one central definition.
- **Design tokens** — the `design-tokens` repo owns tokens and self-hosted faces.
- **Commerce logic** — `commercekit`: money that cannot drift, a cart that never
  caches a price, non-overselling reservation, guest identity.
- **The ratchet** — `shared-inventory.sh --check`, which is the only mechanism in
  this fleet that has actually stopped duplication. Documents did not.

## What is missing

1. **The storefront kernel.** The app layer above. This is the work.
2. **`create-shop`.** One command: create repo from a minimal skeleton, write
   `shop.config.ts`, append the `apps.conf` line, create the database, run
   `sync-infra.sh`, deploy, health-check. Everything in that list is already
   scriptable today; nothing new has to be invented.
3. **Catalogue field types** — the declarative bit above, with an admin UI that
   renders from the declaration rather than from hand-written forms.

---

## Build order

Do **not** build the kernel speculatively. Extract it, the same way
`commercekit` was extracted — from real shops, at the third instance.

1. **Shop #1: build normally, on `commercekit`.** Take the friction seriously
   and note every hand-written thing.
2. **Shop #2: build normally again.** Now the duplication is real rather than
   predicted, and its shape is visible.
3. **Extract the kernel from #1 and #2.** Roughly a week.
4. **Shops #3–#6: config only.** This is where the hour applies.

That sequences to about a week of kernel plus six hours of shops — comfortably
inside a month — and it avoids the failure mode where a framework is designed
for requirements that turn out not to exist.

### Which shop to build the kernel on

**Not evig.** It is the most exotic of the three: peer-to-peer, with escrow,
disputes, seller payouts and verification. Generalising from the hardest case
produces a kernel that is complicated for everyone and right for one.

Build it on the **simple first-party DTC case** — one seller, own stock, fixed
catalogue — which is what most of the six will be. P2P marketplace stays a
separate, later vertical, and evig stays bespoke on top of `commercekit`.

Fixing evig's registration wall (see `fleet-shops-decision.md`) is urgent and
separate from this. Do not couple them.

---

## Beyond shops: the studio pattern

The same shape generalises, and the fleet already shows which verticals are
real, because each has already been written three times:

| Vertical | Already built in |
|---|---|
| **Commerce** | evig, petvity, fitfoot |
| **Booking** | petvity, vitareba, s-ink |
| **Content / blog** | petvity, botsmann, revampit |
| **Directory / profiles** | petvity, evig, reparaturbonus |

So the studio system is: **one spine** (auth, deploy, CI, tokens, i18n, legal,
SEO, health, email) plus **verticals installed onto it**. A new client site is
spine + the verticals it needs + brand + content.

Booking is the obvious second vertical, by exactly the same rule of three, and
`vitareba`'s native slot booking is the most mature implementation to extract
from.

---

## What an hour does *not* buy

Worth being explicit, because the promise will otherwise break on shop #1. An
hour produces a **correct, deployed, genuinely buyable storefront**. It does not
produce a **business**. Still needed, and not automatable:

- **Products.** Someone has to know what is being sold and be able to ship it.
  This is the actual bottleneck — Petvity has a working checkout and zero
  products, and evig has 213 listings and no way to buy them.
- **Brand** beyond choosing a palette.
- **Tax and shipping rules.** VAT, cross-border thresholds, duty. Genuinely
  per-business and legally consequential.
- **A payment account.** Stripe onboarding and KYC is days, not minutes.
- **Legal review.** CH and EU distance selling carry statutory withdrawal
  rights; generated terms are a starting point, not compliance.
- **Fulfilment.** Whoever picks, packs and posts.

The system removes the engineering time. It does not remove the business, and
pretending otherwise is how a studio ships six empty shops.
