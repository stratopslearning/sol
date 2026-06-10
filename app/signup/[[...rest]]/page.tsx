import { AuthShell } from "@/components/auth/AuthShell";
import { AuthSignUp } from "@/components/auth/AuthSignUp";

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
      <AuthSignUp />
    </AuthShell>
  );
}
