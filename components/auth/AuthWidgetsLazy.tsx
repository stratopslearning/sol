"use client";

import dynamic from "next/dynamic";

import { AuthFormSkeleton } from "@/components/auth/AuthFormSkeleton";

/** Client-only Clerk widget — avoids signup/login hydration mismatches. */
export const AuthSignUpLazy = dynamic(
  () => import("@/components/auth/AuthSignUp").then((m) => m.AuthSignUp),
  { ssr: false, loading: () => <AuthFormSkeleton variant="signup" /> },
);

export const AuthSignInLazy = dynamic(
  () => import("@/components/auth/AuthSignIn").then((m) => m.AuthSignIn),
  { ssr: false, loading: () => <AuthFormSkeleton variant="signin" /> },
);
