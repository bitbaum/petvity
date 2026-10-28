export const BCRYPT_SALT_ROUNDS = 12;

/** Password reset token valid for 1 hour */
export const PASSWORD_RESET_TOKEN_EXPIRY_MS = 60 * 60 * 1000;

/** Where a successful sign-in lands unless a safe returnTo overrides it. */
export const POST_LOGIN_PATH = "/portal/dashboard";
