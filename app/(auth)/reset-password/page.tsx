import { redirect } from "next/navigation";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

/**
 * Reset links land on /login, where AccountKit's sign-in form opens the
 * recovery step (lib/auth/methods.ts). This address is kept for links and
 * bookmarks that still name it.
 */
export default async function ResetPasswordPage({ searchParams }: Props) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(await searchParams)) {
    if (typeof value === "string") query.set(key, value);
  }
  const rest = query.toString();
  redirect(rest ? `/login?${rest}` : "/login");
}
