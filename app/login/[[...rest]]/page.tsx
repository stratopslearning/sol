import { AuthShell } from "@/components/auth/AuthShell";
import { AuthSignIn } from "@/components/auth/AuthSignIn";

export const metadata = {
  title: "Sign in",
};

export default function LoginPage() {
  return (
    <AuthShell
      title="Back to your quizzes"
      description="Sign in to review attempts, publish quizzes, and clear the grading queue."
      footnote="Sessions are scoped to one device. Sign out by closing your browser when you are done."
    >
      <AuthSignIn />
    </AuthShell>
  );
}
