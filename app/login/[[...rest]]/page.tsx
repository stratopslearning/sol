import { SignIn } from "@clerk/nextjs";

import { AuthShell } from "@/components/auth/AuthShell";
import { clerkAppearance } from "@/components/auth/clerk-appearance";
import { withBasePath } from "@/lib/basePath";

export const metadata = {
  title: "Sign in",
};

export default function LoginPage() {
  return (
    <AuthShell
      eyebrow="Members area"
      title={
        <>
          Welcome back to{" "}
          <em
            className="text-brand"
            style={{ fontVariationSettings: '"opsz" 96, "WONK" 1' }}
          >
            SOL.
          </em>
        </>
      }
      description="Sign in to continue your courses, review attempts, and grade outstanding submissions."
      footnote="By signing in you agree to SOL's institutional terms of use. Sessions are scoped to a single device; close the browser to end yours."
    >
      <SignIn
        path={withBasePath("/login")}
        routing="path"
        signUpUrl={withBasePath("/signup")}
        forceRedirectUrl={withBasePath("/")}
        appearance={clerkAppearance}
      />
    </AuthShell>
  );
}
