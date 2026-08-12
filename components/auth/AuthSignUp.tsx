"use client";

import { SignUp } from "@clerk/nextjs";

import { AuthFormSkeleton } from "@/components/auth/AuthFormSkeleton";
import { clerkAppearance } from "@/components/auth/clerk-appearance";
import { withBasePath } from "@/lib/basePath";

export function AuthSignUp() {
  return (
    <SignUp
      path={withBasePath("/signup")}
      routing="path"
      signInUrl={withBasePath("/login")}
      // Prefer Clerk's redirect_url (OAuth consent for Claude.ai / ChatGPT MCP).
      // Fallback sends normal sign-ups to /dashboard, which routes by role.
      fallbackRedirectUrl={withBasePath("/dashboard")}
      appearance={clerkAppearance}
      fallback={<AuthFormSkeleton variant="signup" />}
    />
  );
}
