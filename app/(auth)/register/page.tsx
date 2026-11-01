import { Suspense } from "react";
import { petvityMethods } from "@/lib/auth/methods";
import { RegisterForm } from "./RegisterForm";

// See login/page.tsx: which methods are offered is runtime env.
export const dynamic = "force-dynamic";

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm methods={petvityMethods()} />
    </Suspense>
  );
}
