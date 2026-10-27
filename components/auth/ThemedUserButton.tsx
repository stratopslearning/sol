"use client";

import { UserButton, useUser } from "@clerk/nextjs";

import { clerkUserButtonAppearance } from "@/components/auth/clerk-user-button-appearance";
import { withBasePath } from "@/lib/basePath";
import { cn } from "@/lib/utils";

type ThemedUserButtonProps = {
  className?: string;
};

/** Clerk UserButton styled to SOL academic tokens (olive / cream). */
export function ThemedUserButton({ className }: ThemedUserButtonProps) {
  const { user } = useUser();
  const fallback = Boolean(user && !user.hasImage);

  return (
    <div
      className={cn(
        "sol-clerk-user-btn",
        fallback && "sol-clerk-user-btn--fallback",
        className,
      )}
    >
      <UserButton
        appearance={clerkUserButtonAppearance}
        afterSignOutUrl={withBasePath("/")}
      />
    </div>
  );
}
