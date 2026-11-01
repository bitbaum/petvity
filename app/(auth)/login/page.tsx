import { safeReturnTo } from "@/lib/auth/safe-redirect";
import { petvityMethods } from "@/lib/auth/methods";
import { POST_LOGIN_PATH } from "@/lib/config/auth";
import { LoginForm } from "./LoginForm";

// Which methods are offered is runtime env (mail, OrangeCat, the bitbaum
// sign-in); a static render would bake in the build machine's answer.
export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ returnTo?: string; next?: string; error?: string }> };

export default async function LoginPage({ searchParams }: Props) {
  const query = await searchParams;
  // The proxy sends ?returnTo=; AccountKit's own links (recovery) carry ?next=.
  const next = safeReturnTo(query.returnTo ?? query.next, POST_LOGIN_PATH);
  return <LoginForm methods={petvityMethods()} next={next} initialError={Boolean(query.error)} />;
}
