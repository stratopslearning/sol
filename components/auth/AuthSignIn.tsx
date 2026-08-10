"use client";

import { SignIn } from "@clerk/nextjs";

import { AuthFormSkeleton } from "@/components/auth/AuthFormSkeleton";
import { clerkAppearance } from "@/components/auth/clerk-appearance";
import { withBasePath } from "@/lib/basePath";

export function AuthSignIn() {
  return (
    <SignIn
      path={withBasePath("/login")}
      routing="path"
      signUpUrl={withBasePath("/signup")}
      // Prefer Clerk's redirect_url (OAuth consent for Claude.ai / ChatGPT MCP).
      // forceRedirectUrl would override that and strand the connector mid-flow.
      fallbackRedirectUrl={withBasePath("/")}
      appearance={clerkAppearance}
      fallback={<AuthFormSkeleton variant="signin" />}
    />
  );
}
