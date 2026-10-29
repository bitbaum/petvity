# Everything repeatable across projects, and what to do about it

**Date:** 2026-08-16
**Method:** measured across 25 local repos. Excludes `node_modules`, `.next`,
`dist`, `.claude/worktrees` (a worktree is the same code counted twice) and
`openclaw` (a fork — counting it measures upstream, not us).

`revampit` is a second clone of `evig`; where both appear the real count is
roughly half.

---

## The measurement

`dotfiles/scripts/ci/shared-inventory.sh` already tracks 9 concerns. These are
the ones it does not.

| Concern | Repos | Files | Notable |
|---|---:|---:|---|
| CI workflow | 23 | 23 | every repo |
| `globals.css` / design tokens | 17 | 17 | despite a `design-tokens` repo existing |
| Deploy workflow | 15 | 16 | |
| OG image generation | 14 | 27 | loki 6 |
| Sitemap / robots | 10 | 21 | |
| Account settings pages | 10 | 20 | orangecat 3 |
| **Cron auth** | **9** | **43** | **orangecat 9, petvity 7, evig 6** |
| CSV import / export | 8 | 18 | |
| Empty / error / loading states | 7 | 22 | orangecat 9 |
| Legal pages | 7 | 14 | |
| Blog / CMS | 6 | ~116 | evig 98 — that is a CMS, not a blog |
| **Stripe webhook** | **6** | **24** | **loki 9** |
| Reviews / ratings | 5 | ~46 | evig 40 |
| i18n config + messages | 5 | ~55 | |
| Auth config | 5 | 7 | |
| Email templates | 5 | 5 | |
| Booking / availability | 4 | 11 | |
| Pagination | 5 | 8 | |
| Upload / storage | 3 | 3 | |
| Middleware / proxy | 4 | 4 | |
| Env validation | 3 | 4 | |
| Format utils | 4 | 4 | |
| Admin user management | 3 | 10 | |
| Auth guards | 2 | 2 | |
| DB test mock | 1 | 1 | petvity only |

---

## The wrong question, and the right one

The obvious question is "how many copies?". It is the wrong one. Copy count
tells you how much typing was repeated, which is nearly free — the machines type
now. It says nothing about whether the duplication is *harmful*.

The right question is: **what does divergence cost?**

Two copies of a date formatter that drift produce two slightly different dates.
Two copies of a security check that drift produce one repo with a hole in it.
Same copy count, incomparable stakes.

That gives four classes, and each has a different correct action.

---

## Class 1 — Divergence is a vulnerability. Share, and gate.

These are not code-reuse questions. They are security questions that happen to
look like code reuse.

**Cron authentication — 43 files, 9 repos, and it was already wrong.**

Four repos, four versions of one check:

```ts
petvity     if (auth !== `Bearer ${process.env.CRON_SECRET}`)          // fails OPEN
evig        if (authHeader !== `Bearer ${cronSecret}`)                 // fails OPEN
kivvi       if (!cronSecret) { log; return 500 } ...                   // guarded
aoz-housing if (!cronSecret || authHeader !== `Bearer ${cronSecret}`)  // guarded
```

With `CRON_SECRET` unset, the first two compare against the literal string
`"Bearer undefined"`. Anyone sending that header is authorised. Behind that gate
in Petvity: an endpoint that wipes and reseeds the demo account, and endpoints
that email every opted-in owner.

Not exploitable today — the variable is set in production. It is a gate that
fails open on a missing environment variable, which is a normal thing to happen
on a new deployment, a new environment, or a typo.

**Fixed in this PR** for all 8 Petvity cron routes: one `requireCronAuth()` that
denies everything when the secret is absent, plus a test asserting no route
re-inlines the comparison — because fixing seven routes fixes seven routes,
while asserting it against the directory fixes the eighth one nobody has written
yet.

**Also in this class, unverified:** Stripe webhook signature verification (24
files, 6 repos). If one of those skips verification, forged "paid" orders are
possible. Worth the same audit; not done here.

**Action:** these go into a shared package *and* get a local assertion in each
repo. Both, not either — the package fixes the implementation, the assertion
catches the repo that never adopted it.

## Class 2 — Divergence is invisible rot. Share centrally.

Infrastructure, where a drifted copy is not wrong so much as *stale*, and nobody
notices until a fix fails to arrive.

CI workflow (23), deploy workflow (15), `auto-merge-sweep.sh` (22 in 8 versions),
health route, env validation, sitemap/robots, OG image generation.

The diagnosis is already written in `SHARED.md` and is the reason it exists.
Nothing new to decide, only to do.

**Action:** one central definition, called remotely. Not templated per repo —
templating is what produced 8 versions of one script.

## Class 3 — Divergence is the entire point. Never share.

- **Brand, copy, markup.** Each app has to look like itself. `ai-forms` ships no
  markup for exactly this reason.
- **Domain schema.** A pet, a refurbished laptop and a housing application are
  not the same row.
- **Business rules.** What counts as "healthy" for a rabbit is not a fleet
  concern.

`globals.css` at 17 repos is the interesting case: it looks like the worst
duplication on the list and is mostly correct. The *tokens* should be shared —
that is what the `design-tokens` repo is for, and 17 hand-maintained palettes
means it is not being adopted. The *values* should differ per brand. Share the
vocabulary; let the values diverge.

## Class 4 — Divergence is harmless. Leave it alone.

Format helpers (4), pagination (8), slug utils, date utils.

Two implementations of `formatDate` that differ slightly cost nothing. Extracting
them costs a package, a version, a release, and a dependency in every consumer —
forever. Complexity compounds, and this is the complexity that compounds without
buying anything.

**Action:** none. Explicitly none, so nobody "tidies" it later.

---

## What this implies for the studio

The verticals worth building, each already written three times:

| Vertical | Written in | Status |
|---|---|---|
| Commerce | evig, petvity, fitfoot | `commercekit` exists; storefront kernel next |
| **Booking** | petvity, vitareba, surf-your-life, orangecat | **4 — the strongest unbuilt case** |
| Content / blog | evig, petvity, botsmann, orangecat | evig's is a full CMS |
| Reviews / ratings | evig, petvity, datacat | small, well-defined |
| Admin CRUD | evig, petvity, surf-your-life | generate from schema, do not hand-write |
| Account & settings | 10 repos, 20 files | the most boring, most repeated screen in the fleet |

Booking is the next extraction after the storefront kernel, and `vitareba`'s
native slot booking is the most mature to extract from.

## The order

1. **Cron auth** — done here for Petvity; port to the other 8 repos. Security,
   cheap, unambiguous.
2. **Audit Stripe webhook verification** across the 6 repos. Same reasoning.
3. **Central CI/deploy**, per `SHARED.md`. Highest copy count, known diagnosis.
4. **Adopt `design-tokens`** in the 17 repos carrying hand-written palettes.
5. **Storefront kernel**, then **booking**.
6. **Account/settings and admin CRUD** — generated from schema rather than
   written, since they are pure boilerplate over a table.

## The rule to keep

Not "share everything". Not "rule of three". Those are proxies.

**Share what is expensive when it diverges. Leave what is cheap. And when
divergence is dangerous, add the check that catches the repo which never
adopted the fix** — because the fix that reaches 9 of 22 repos is the failure
mode this fleet has already measured twice.
