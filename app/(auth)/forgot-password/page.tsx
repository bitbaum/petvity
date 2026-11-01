import { petvityMethods } from "@/lib/auth/methods";
import { RecoveryScreen } from "@/components/auth/RecoveryScreen";

// Whether recovery can be offered depends on account mail, which is runtime env.
export const dynamic = "force-dynamic";

export default function ForgotPasswordPage() {
  return <RecoveryScreen methods={petvityMethods()} />;
}
