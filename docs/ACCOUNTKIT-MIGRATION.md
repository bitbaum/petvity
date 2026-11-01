# AccountKit migration

Petvity signs in through AccountKit since 2026-11-01, and since the same day
on AccountKit's own screens with every method: email and password, an email
sign-in link, passkeys, two-factor codes, password recovery, Sign in with
OrangeCat and the shared bitbaum sign-in (each shown when its env is set;
`lib/auth/methods.ts`). Auth.js is gone from the tree, Google with it. Migration
`drizzle/0008_accountkit_staging.sql` adds AccountKit's tables beside it under
the `auth_` prefix (`createAuthTables("auth_")` in `lib/db/accountkit.ts`),
because Auth.js already owns `users`, `accounts` and `sessions`. The fleet's acceptance queue is
[Fleet's checkpoint](https://github.com/bitbaum/fleet/blob/main/docs/remediation-resume-2026-10-29.md).

## Rehearse the import

Against an isolated database holding an authorised snapshot, after every
migration:

```sh
DATABASE_URL=postgres://… pnpm run db:rehearse-import
```

It runs `scripts/db/accountkit-import.sql` in one transaction, always rolls
back, and prints only counts. There is no apply mode. It takes locks even
though it rolls back, so never point it at the served database.

The import keeps each `users.id` as the shared user id, so pets, bookings,
orders and reviews keep pointing at the same person. Addresses are
lower-cased and their verification is kept. bcrypt hashes are copied byte for
byte and sign in through `legacyBcrypt`. An `orangecat_sub` becomes an
`orangecat` account row, the pair AccountKit's OIDC sign-in looks up. Roles
stay on `users`. Google links in Auth.js's `accounts` table are not carried
over: Google is not mounted in production, and AccountKit reaches Google
through the bitbaum sign-in. Two addresses that collide once lower-cased,
drift between runs, or an already-used shared runtime fail the transaction.

The import finally attaches the mirror triggers defined in migration 0008.
From then on every Petvity writer of `users` keeps `auth_users` and the
credential row in step: registration, the reset link, the settings password
change, the demo reset and account deletion. A password change ends every
other shared session; `/api/account` names its own session in
`petvity.keep_session`, so the person changing it stays signed in. A reset
ends every session.

## Shared runtime (on since 2026-11-01; the first step)

The runtime in `lib/auth/shared/` answers every sign-in. It first ran behind
`AUTH_RUNTIME=accountkit`; since the screens step it no longer reads that
switch, and Auth.js is gone. The secret is `BETTER_AUTH_SECRET`,
or the `AUTH_SECRET` the box already holds. Absolute URLs use `AUTH_URL`, which
production already sets.

- `auth()` keeps today's session shape (`id`, `role`, `emailVerified`, `name`).
  It is read from the shared session and the `users` row on every request, so
  a role change or a rename applies on the next request. `ADMIN_EMAILS`
  promotes at a password sign-in, never for OrangeCat
  (`lib/auth/claims.ts`, the same rule the Auth.js jwt callback uses).
- The pages keep `next-auth/react`. AccountKit's compat layer
  (`@bitbaum/accountkit/auth/nextauth-compat`, configured in
  `lib/auth/shared/compat.ts`) answers its calls from the shared runtime:
  `session` GET and POST, `csrf`, `providers`, `signout`,
  `callback/credentials` and `signin/orangecat`. In the first step only the
  session, sign-in, sign-out and the OAuth callback of AccountKit's own
  endpoints were open, so there was no second credential writer; the screens
  step opened the rest (below).
- A person AccountKit creates itself (a first OrangeCat sign-in) gets a
  Petvity row under the same id (`lib/auth/shared/accounts.ts`), as a pet owner
  with an unverified address.

`lib/auth/shared/__tests__/journeys.test.ts` runs these through the real
handlers on the replayed migration chain and the real import. CI's
`browser-smoke.yml` account job runs the rehearsal and those journeys, then the
whole browser account journey once per runtime. That is not deployed evidence.

## AccountKit's screens (2026-11-01; the second step)

`/login` renders AccountKit's `SignInForm`, `/register` its `SignUpForm`,
`/forgot-password` its recovery form, and `/portal/settings/security` its
`AccountPanel` (password, passkeys, two-factor, linked sign-ins, deleting the
account). `lib/auth/shared/compat.ts` passes `screens: "accountkit"`
(AccountKit 0.20.0), so all of AccountKit's endpoints are open; `useSession`
and `signOut` on the other pages keep the `next-auth/react` protocol and
Petvity's session shape. The demo button still signs in through the
credentials callback.

- **AccountKit is the only credential writer.** Petvity's registration
  (`POST /api/account`), its reset routes, the settings password change and
  its own account deletion are removed. New passwords are AccountKit's scrypt
  in `auth_accounts`; `users.password` keeps each imported bcrypt hash but is
  no longer read by anything.
- **Kept working:** the same user ids, every imported bcrypt hash
  (`legacyBcrypt`), every OrangeCat link, roles on `users`, `ADMIN_EMAILS`
  promotion at a password or email-link sign-in (`petvity-plugin.ts`).
- **Migration 0009** makes the panel's rename and deletion reach `users`
  (the deletion cascades through pets, bookings, orders and the rest, as the
  old settings deletion did). It replaces the mirror function in place and
  attaches the deletion trigger where the mirror is attached.
- **The demo account** is shared, so `petvity-plugin.ts` refuses any change
  to how it signs in, its deletion, and any mailed link to its address. The
  reset cron still rewrites it through `users.password` and the mirror.
- **Sign-up** asks for an email and a password, nothing else (AccountKit's
  rule). Every account starts as a pet owner; the "I am joining as…" choice
  sends a vet, sitter or groomer to `/portal/become-a-pro`. The welcome mail
  sequence, which greets by name, is not sent to these sign-ups (as for
  OrangeCat sign-ups before); AccountKit sends its confirmation link.

- **An email sign-in link proves the address.** When it signs in a person whose
  address was not yet confirmed, better-auth drops any password set before
  that proof (`revokeUnprovenAccountAccess`, a guard against someone who
  registered another person's address first). That person sets a password
  again through "Forgot your password?".

CI (`browser-smoke.yml`) runs every way in against the production build and a
migrated, imported PostgreSQL, with an Auth.js-era bcrypt account seeded before
the import and AccountKit's mail caught by `scripts/ci/mail-sink.cjs`.

### Rolling back the screens

Revert the pull request that adopted them. That restores Petvity's pages and
writers on the same shared runtime, which still verifies every password set
since (scrypt) and every imported one. Do **not** run Loki's
`accountkit-switch.yml rollback` any more: it empties the shared tables, and
since this step they hold the only copy of every password set, every passkey
and every second factor.

## Switched (2026-11-01)

The switch ran from Loki's `accountkit-switch.yml`
(`scripts/hetzner/accountkit-switch.sh`, see Loki's
`docs/architecture/accountkit-migration.md`):

1. A survey counted 10 accounts and nobody whose only way in would be
   lost.
2. The import ran once, under locks, and attached the mirror triggers.
3. `AUTH_RUNTIME=accountkit` was set and the app restarted.
4. A live proof ran on the public site. A throwaway account signed in through
   the product's own sign-in route, read its session back, signed out, and
   was deleted.

Everyone signed in under Auth.js signs in again once.

The OrangeCat round-trip starts on the live site: the sign-in button reaches
OrangeCat's authorize page with the redirect `/api/auth/callback/orangecat`,
which client `petvity` accepts. AccountKit 0.18.1 made that work; 0.18.0
started it through an endpoint better-auth 1.7 removed (bitbaum/accountkit#55).

Until AccountKit's screens were adopted, the rollback was the same workflow
with `rollback` (unset `AUTH_RUNTIME`, restart on Auth.js, drop the mirrors,
empty the shared tables). Since then it would lose data; see "Rolling back the
screens" above.

Proven live on 2026-11-01 by Loki's `accountkit-switch.yml` `prove` action,
using throwaway accounts that it deleted again:

- two sessions at once;
- a change to the person's row, read on the next request (the path a role,
  staff or company change takes);
- a password write, which is what a reset and a password change do. It ended
  both sessions, the old password was refused and the new one signed in;
- sign-out, and deleting the person ending their session;
- a real browser sign-in with a throwaway OrangeCat account: the product's
  OrangeCat button, OrangeCat's sign-in and consent, and back in, signed in.
  Its first run found that the first such sign-in failed
  (`unable_to_create_user`); AccountKit 0.19.0 fixed it
  (bitbaum/accountkit#56).

Not proven by a machine: a reset mail arriving in a real inbox. Since the
screens step the reset is AccountKit's; CI follows its mailed link end to end.
