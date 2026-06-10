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
      forceRedirectUrl={withBasePath("/")}
      appearance={clerkAppearance}
      fallback={<AuthFormSkeleton variant="signup" />}
    />
  );
}
