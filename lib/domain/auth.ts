import { z } from "zod";
import { getAdminEmails } from "@/lib/config/app";
import { MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH } from "@bitbaum/accountkit/auth/password";
import type { UserRole } from "@/lib/auth/types";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const registerSchema = z.object({
  name: z.string().max(100).optional(),
  email: z.string().email(),
  password: z.string().min(MIN_PASSWORD_LENGTH).max(MAX_PASSWORD_LENGTH),
  /**
   * Professionals (vets, sitters) declare their role at sign-up.
   * Admin email always overrides to "admin". Omitting defaults to "pet_owner".
   */
  intendedRole: z.enum(["pet_owner", "veterinarian", "pet_sitter", "groomer"]).optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;

/**
 * Resolve the role for a new user.
 *   1. ADMIN_EMAILS env var → "admin" (always wins)
 *   2. intendedRole provided → honour it (trust-first for pros)
 *   3. Default → "pet_owner"
 */
export function resolveRole(
  email: string,
  intendedRole?: "pet_owner" | "veterinarian" | "pet_sitter" | "groomer",
): UserRole {
  const adminEmails = getAdminEmails();
  if (adminEmails.includes(email.toLowerCase())) return "admin";
  if (
    intendedRole === "veterinarian" ||
    intendedRole === "pet_sitter" ||
    intendedRole === "groomer"
  )
    return intendedRole;
  return "pet_owner";
}
