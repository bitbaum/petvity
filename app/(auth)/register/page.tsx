import { Suspense } from "react";
import { orangecatClient } from "@bitbaum/accountkit/orangecat";
import { RegisterForm } from "./RegisterForm";

// See login/page.tsx: whether OrangeCat is offered is runtime env.
export const dynamic = "force-dynamic";

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm orangecat={orangecatClient() !== null} />
    </Suspense>
  );
}
