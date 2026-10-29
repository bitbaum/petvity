import { Suspense } from "react";
import { orangecatClient } from "@bitbaum/accountkit/orangecat";
import { LoginForm } from "./LoginForm";

// The OrangeCat button exists only when the box holds the client pair, which
// is runtime env — a static render would bake in the build machine's answer.
export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm orangecat={orangecatClient() !== null} />
    </Suspense>
  );
}
