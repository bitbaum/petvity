# What to do with the shops

**Date:** 2026-08-16
**Scope:** fleet-wide. This lives in the Petvity repo because that is where the
work happened; it belongs in `dotfiles/SHARED.md` alongside the package registry.

---

## The evidence

Everything below was measured against production, not inferred from code.

| | **evig / revampit** | **petvity** | **fitfoot** |
|---|---|---|---|
| Deployed | ✓ two hostnames, one build | ✓ | ✗ **not deployed anywhere** |
| Active listings | **213** | **0** | — |
| Orders, ever | **0** | 4, all my own e2e fixtures, all cancelled | — |
| Users | 21 | 9 | — |
| Buy without an account | ✗ **"Jetzt kaufen" → /auth/login** | ✓ shipped 2026-08-16 | — |
| Stack | bespoke Next + Drizzle, mature | bespoke Next + Drizzle, on commercekit | **Medusa** |
| Last real commit | today | today | 2026-03-28, CI disabled |
| Repo size | 154 MB | 2.8 MB | 26 MB |

Revenue across all three: **zero**.

## The finding

The fleet does not have a "too many shops" problem, and it does not have an
under-built shop problem. It has two shops that fail in exactly complementary
ways:

- **evig has 213 real items and cannot be bought from.** Clicking "Jetzt kaufen"
  on a live listing sends a stranger to `/auth/login`. Verified in a browser
  against production today.
- **petvity can be bought from and has nothing to sell.** Guest checkout works
  end to end; the catalogue is empty because it is a peer-to-peer marketplace
  with no sellers.

213 items × 21 users × 0 orders is not a demand problem you can conclude
anything from, because the funnel has a wall in the middle of it.

---

## Decisions

### 1. evig is *the* shop. Ship guest checkout there.

It has the inventory, the users, a real underlying organisation, and daily
development. Removing the registration wall is the single highest-value change
available anywhere in the fleet — and the pattern is already built, proven and
running in production in Petvity.

This is not speculative work: it is a port of something that exists.

**The port, concretely:**

| Petvity file | evig equivalent |
|---|---|
| `orders.userId` nullable + `guestEmail` + `publicToken` + XOR CHECK | `marketplace_orders` needs the same three columns and constraint. `commercekit`'s `BUYER_IDENTITY_CHECK` is the SQL. |
| `POST /api/shop/checkout` (public, rate limited) | new public sibling to `POST /api/marketplace/orders`, which is currently `withAuth(...)` at `src/app/api/marketplace/orders/route.ts:38` |
| `placeOrder()` shared by both entry points | evig's order creation logic extracted the same way, so the authed and guest paths cannot drift |
| `/[locale]/shop/order/[token]` receipt | evig needs a token receipt page; a guest has no `/dashboard` to return to |
| `leftJoin` + `COALESCE` on buyer | **critical** — evig joins `users` on the buyer. Once that column is nullable, an inner join silently hides every guest order from the seller who has to ship it. |

The last row is the one that bites. It is written up in Petvity's `CLAUDE.md`
gotcha 12 and it is the reason this port needs doing carefully rather than
quickly.

**Also worth fixing while there:** evig stores 2 price columns as
`decimal`/`numeric` against 24 as integer cents. Mixed money representations in
one schema is a drift source; `commercekit`'s `money` module exists for this.

### 2. petvity is not a shop. Stop growing it like one.

Petvity's differentiated product is the species-aware health record — the thing
no competitor has and the thing the whole data flywheel depends on. The shop is
a supporting feature.

Concretely:
- **Keep** the guest checkout. It is built, correct and costs nothing to keep.
- **Stop** treating "fill the catalogue" as a priority. A P2P marketplace needs
  seller supply; Petvity has none and acquiring it is a business in itself.
- **If** Petvity ever sells, sell **first-party** — own-brand or affiliate on a
  narrow range tied to the health content (the joint supplement the app just
  told you about) — not an open marketplace. That converts the health record
  into the demand signal, which is a thing only Petvity can do.
- The current empty shop is honest and does no harm; a shop stocked with things
  nobody can ship would.

### 3. fitfoot: archive it, or rebuild it on commercekit. Do not leave it.

Not deployed, dormant since March, CI deliberately disabled, 26 MB, and built on
Medusa — which is now explicitly out of the stack.

- If Swiss sustainable footwear is not a live business: **archive the repo.**
- If it is: **rebuild as a thin storefront on `commercekit`.** That is now days
  of work rather than months, and it starts from a first-party foundation
  instead of a framework we have decided against.

Either way it should not sit as a dormant Medusa deployment nobody maintains.

### 4. One engine, several storefronts.

`commercekit` is the shared core: money, cart, inventory, buyer identity,
addresses. Any future shop starts there. No fourth bespoke commerce
implementation.

What stays per-shop, correctly: the catalogue model, the order state machine,
fulfilment, and the UI. Those genuinely differ between refurbished laptops, pet
supplies and footwear, and centralising them would be the wrong kind of reuse.

### 5. One open question for a human

`evig.orangecat.ch` and `revampit.orangecat.ch` serve the **same build** and
share the `revampit` database. Two brands on one codebase may well be
deliberate — evig is the pivot, RevampIT the existing organisation — but it
should be a stated decision rather than an accident of deployment, because it
determines whose name is on the invoice.

---

## Order of work

1. **Guest checkout on evig.** Highest value in the fleet by a wide margin: it
   is the difference between 213 listings that cannot be bought and 213 that can.
2. **Decide fitfoot's fate.** Cheap, and it removes a liability either way.
3. **evig money representation** onto `commercekit`, while the schema is being
   touched anyway.
4. **Petvity first-party products**, only once there is something real to ship.

## What this document does not do

It does not touch evig. That work needs a session in the evig repo — this one is
sandboxed to the Petvity worktree and cannot write a sibling checkout. The port
plan above is written to be executable by whoever picks it up.
