import { AuthShell } from "@/components/auth/AuthShell";
import { AuthSignInLazy } from "@/components/auth/AuthWidgetsLazy";

export const metadata = {
  title: "Sign in",
};

export default function LoginPage() {
  return (
    <AuthShell
      title="Welcome back"
      description="Sign in to open your desk, review work, and keep teaching moving."
      footnote="Sessions are scoped to one device. Sign out when you are done on a shared computer."
      paintingSrc="/marketing/auth-sealed-journal.jpg"
      paintingAlt="Oil painting of a leather-bound journal with a red wax seal on a sunlit desk"
    >
      <AuthSignInLazy />
    </AuthShell>
  );
}
