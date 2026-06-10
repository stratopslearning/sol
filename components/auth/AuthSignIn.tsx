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
      forceRedirectUrl={withBasePath("/")}
      appearance={clerkAppearance}
      fallback={<AuthFormSkeleton variant="signin" />}
    />
  );
}
