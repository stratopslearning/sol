import { AuthShell } from "@/components/auth/AuthShell";
import { AuthSignUpLazy } from "@/components/auth/AuthWidgetsLazy";

export const metadata = {
  title: "Sign up",
};

export default function SignUpPage() {
  return (
    <AuthShell
      title="Create your account"
      description="Sign up to build quizzes, join sections, and let AI handle the subjective grading."
      footnote="SOL is invite only at most institutions. Ask your faculty lead to request access for your department."
    >
      <AuthSignUpLazy />
    </AuthShell>
  );
}
