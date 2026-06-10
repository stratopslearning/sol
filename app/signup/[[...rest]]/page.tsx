"use client";

import { SignUp } from "@clerk/nextjs";

import { AuthShell } from "@/components/auth/AuthShell";
import { clerkAppearance } from "@/components/auth/clerk-appearance";
import { withBasePath } from "@/lib/basePath";

export default function SignUpPage() {
  return (
    <AuthShell
      eyebrow="Sign Up"
      title={
        <>
          Begin your study at{" "}
          <em
            className="text-brand"
            style={{ fontVariationSettings: '"opsz" 96, "WONK" 1' }}
          >
            SOL.
          </em>
        </>
      }
      description="Create an account to enroll in courses, take quizzes, and track your progress over time. Faculty accounts are provisioned by your institution."
      footnote="SOL is currently invite-only at most institutions. If your university hasn't onboarded yet, your faculty lead can request a department-wide pilot."
    >
      <SignUp
        path={withBasePath("/signup")}
        routing="path"
        signInUrl={withBasePath("/login")}
        forceRedirectUrl={withBasePath("/")}
        appearance={clerkAppearance}
      />
    </AuthShell>
  );
}
