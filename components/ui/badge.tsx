import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  [
    "inline-flex items-center justify-center gap-1 w-fit shrink-0 whitespace-nowrap",
    "rounded-sm border px-1.5 py-0.5",
    "font-sans text-[0.625rem] font-semibold uppercase tracking-[0.12em]",
    "[&>svg]:size-3 [&>svg]:pointer-events-none",
    "transition-colors",
  ].join(" "),
  {
    variants: {
      variant: {
        default:
          "bg-brand-soft text-brand border-brand/30",
        secondary:
          "bg-surface-sunken text-ink-muted border-rule",
        destructive:
          "bg-danger-soft text-danger border-danger/30",
        outline:
          "bg-transparent text-ink-muted border-rule",
        success:
          "bg-success-soft text-success border-success/30",
        warning:
          "bg-warning-soft text-[oklch(0.45_0.14_75)] dark:text-warning border-warning/30",
        accent:
          "bg-accent-soft text-accent border-accent/30",
        info:
          "bg-info-soft text-info border-info/30",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span"

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
