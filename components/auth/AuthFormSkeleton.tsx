import { cn } from "@/lib/utils";

function Block({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-[0.625rem] bg-surface-sunken auth-skeleton-pulse",
        className,
      )}
      aria-hidden
    />
  );
}

function Divider() {
  return (
    <div className="flex items-center gap-3 w-full my-1" aria-hidden>
      <div className="h-px flex-1 bg-rule" />
      <span className="text-xs text-ink-faint shrink-0">or use email</span>
      <div className="h-px flex-1 bg-rule" />
    </div>
  );
}

export function AuthFormSkeleton({
  variant,
}: {
  variant: "signin" | "signup";
}) {
  return (
    <div
      className="flex flex-col gap-5 w-full"
      role="status"
      aria-live="polite"
      aria-label={
        variant === "signup" ? "Loading sign up form" : "Loading sign in form"
      }
    >
      <div className="grid grid-cols-2 gap-3 w-full">
        <Block className="h-11" />
        <Block className="h-11" />
      </div>

      <Divider />

      {variant === "signup" ? (
        <div className="grid grid-cols-2 gap-3 w-full">
          <div className="flex flex-col gap-1.5">
            <Block className="h-3 w-16" />
            <Block className="h-11" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Block className="h-3 w-16" />
            <Block className="h-11" />
          </div>
        </div>
      ) : null}

      <div className="flex flex-col gap-1.5 w-full">
        {variant === "signup" ? <Block className="h-3 w-24" /> : null}
        <Block className="h-11" />
      </div>

      {variant === "signup" ? (
        <div className="flex flex-col gap-1.5 w-full">
          <Block className="h-3 w-20" />
          <Block className="h-11" />
        </div>
      ) : null}

      <Block className="h-11 w-full mt-1 bg-brand/25 auth-skeleton-pulse" />

      <div className="border-t border-rule/80 pt-5 mt-1 flex justify-center">
        <Block className="h-4 w-48" />
      </div>
    </div>
  );
}
