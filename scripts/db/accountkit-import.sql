-- Copy Petvity's accounts into AccountKit's auth_* tables (migration 0008). Run
-- only inside a transaction, with Petvity's credential writes stopped for the
-- cutover. The rehearsal CLI (accountkit-import-rehearse.mjs) always rolls
-- back; this is deliberately not a migration. docs/ACCOUNTKIT-MIGRATION.md.
--
-- Each users.id stays the shared user id, so every table that references it
-- (pets, bookings, orders, reviews) keeps pointing at the same person. Roles
-- stay on `users`; AccountKit's generic role is not used. Verification is kept
-- as it is. Google links in Auth.js's `accounts` are not carried: Google is not
-- mounted in production and AccountKit reaches it through the bitbaum sign-in.
LOCK TABLE users, auth_users, auth_accounts, auth_sessions,
  auth_passkeys, auth_two_factors, auth_verifications IN SHARE ROW EXCLUSIVE MODE;

CREATE TEMP TABLE petvity_accountkit_users ON COMMIT DROP AS
SELECT id::text AS id, coalesce(name, '') AS name, lower(trim(email)) AS email,
  email_verified IS NOT NULL AS verified, image, password, orangecat_sub
FROM users;

DO $$ BEGIN
  IF EXISTS (SELECT email FROM petvity_accountkit_users GROUP BY email HAVING count(*) > 1)
    OR EXISTS (SELECT 1 FROM petvity_accountkit_users WHERE email = '' OR email NOT LIKE '%@%')
  THEN RAISE EXCEPTION 'Account import requires address reconciliation'; END IF;

  -- Never a second writer beside a live shared runtime: nothing a person did
  -- there (a session, a passkey, a factor, a token) may be overwritten.
  IF EXISTS (SELECT 1 FROM auth_sessions) OR EXISTS (SELECT 1 FROM auth_passkeys)
    OR EXISTS (SELECT 1 FROM auth_two_factors) OR EXISTS (SELECT 1 FROM auth_verifications)
  THEN RAISE EXCEPTION 'Account import refuses an active shared runtime'; END IF;
END $$;

INSERT INTO auth_users (id, name, email, email_verified, image)
SELECT id, name, email, verified, image FROM petvity_accountkit_users
ON CONFLICT DO NOTHING;

-- bcrypt hashes byte for byte: the runtime verifies them through legacyBcrypt.
INSERT INTO auth_accounts (id, account_id, provider_id, user_id, password)
SELECT 'petvity-credential:' || id, id, 'credential', id, password
FROM petvity_accountkit_users WHERE password IS NOT NULL
ON CONFLICT DO NOTHING;

-- "Sign in with OrangeCat": the sub is the provider's subject, exactly the
-- (provider_id, account_id) pair AccountKit's OIDC sign-in looks up.
INSERT INTO auth_accounts (id, account_id, provider_id, user_id)
SELECT 'petvity-orangecat:' || orangecat_sub, orangecat_sub, 'orangecat', id
FROM petvity_accountkit_users WHERE orangecat_sub IS NOT NULL
ON CONFLICT DO NOTHING;

DO $$ BEGIN
  -- A repeat is a no-op only for the same snapshot. Anything that drifted (an
  -- address, a verification, a password, a link) fails the whole transaction.
  IF EXISTS (
    SELECT 1 FROM petvity_accountkit_users s
    LEFT JOIN auth_users u ON u.id = s.id
    LEFT JOIN auth_accounts c ON c.user_id = s.id AND c.provider_id = 'credential'
    LEFT JOIN auth_accounts o ON o.user_id = s.id AND o.provider_id = 'orangecat'
    WHERE u.id IS NULL OR u.email IS DISTINCT FROM s.email
      OR u.email_verified IS DISTINCT FROM s.verified
      OR c.password IS DISTINCT FROM s.password
      OR (s.password IS NULL AND c.id IS NOT NULL)
      OR o.account_id IS DISTINCT FROM s.orangecat_sub
  ) OR EXISTS (
    SELECT 1 FROM auth_users u
    WHERE NOT EXISTS (SELECT 1 FROM petvity_accountkit_users s WHERE s.id = u.id)
  ) THEN RAISE EXCEPTION 'Account import snapshot differs; no changes committed'; END IF;
END $$;

-- From here on every writer of either table keeps the other in step
-- (functions in migrations 0008 and 0009). Rolled back with everything else in a rehearsal.
DROP TRIGGER IF EXISTS petvity_accountkit_from_users ON users;
CREATE TRIGGER petvity_accountkit_from_users AFTER INSERT OR UPDATE OR DELETE ON users
  FOR EACH ROW EXECUTE FUNCTION petvity_accountkit_from_users();
DROP TRIGGER IF EXISTS petvity_accountkit_to_users ON auth_users;
CREATE TRIGGER petvity_accountkit_to_users AFTER UPDATE ON auth_users
  FOR EACH ROW EXECUTE FUNCTION petvity_accountkit_to_users();
-- AccountKit's own account deletion removes the Petvity account (migration 0009).
DROP TRIGGER IF EXISTS petvity_accountkit_delete_users ON auth_users;
CREATE TRIGGER petvity_accountkit_delete_users AFTER DELETE ON auth_users
  FOR EACH ROW EXECUTE FUNCTION petvity_accountkit_delete_users();
