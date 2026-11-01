import { emailEarnsPromotion } from "@bitbaum/accountkit/orangecat";
import { resolveRole } from "@/lib/domain/auth";
import type { UserRole } from "./types";

/**
 * The role a sign-in leaves a person with. ADMIN_EMAILS may only PROMOTE, and
 * only at a sign-in whose address the product can trust: resolveRole without
 * an intendedRole answers "pet_owner" for everyone else, and writing that back
 * would demote every vet and sitter. Never for an OrangeCat sign-in, whose
 * address is unverified profile data. One rule for both runtimes.
 */
export function roleAfterSignIn(
  provider: string | null | undefined,
  email: string | null | undefined,
  existing: UserRole,
): UserRole {
  return emailEarnsPromotion(provider) && resolveRole(email ?? "") === "admin" ? "admin" : existing;
}
