import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { Loader2 } from "lucide-react"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap select-none",
    "rounded-md text-sm font-medium font-sans",
    "transition-all duration-150 ease-out",
    "disabled:pointer-events-none disabled:opacity-50",
    "[&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0",
    "outline-none focus-visible:outline-2 focus-visible:outline-brand focus-visible:outline-offset-2",
    "active:translate-y-px",
  ].join(" "),
  {
    variants: {
      variant: {
        default:
          "bg-brand text-brand-foreground hover:bg-brand-hover paper-shadow",
        destructive:
          "bg-danger text-paper hover:opacity-90 paper-shadow",
        outline:
          "border border-rule bg-surface text-ink hover:bg-surface-sunken hover:border-rule-strong",
        secondary:
          "bg-surface-sunken text-ink border border-rule hover:bg-surface hover:border-rule-strong",
        ghost:
          "text-ink-muted hover:text-ink hover:bg-surface-sunken",
        link:
          "text-brand underline underline-offset-4 decoration-brand-soft hover:decoration-brand p-0 h-auto",
        editorial:
          "bg-ink text-paper hover:bg-ink/90 paper-shadow font-medium uppercase tracking-[0.08em] text-xs",
        accent:
          "bg-accent text-accent-foreground hover:opacity-90 paper-shadow",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5 text-xs",
        lg: "h-11 rounded-md px-6 text-base has-[>svg]:px-5",
        xl: "h-12 rounded-md px-8 text-base has-[>svg]:px-6",
        icon: "size-9",
        iconSm: "size-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

interface ButtonProps extends React.ComponentProps<"button">, VariantProps<typeof buttonVariants> {
  asChild?: boolean
  loading?: boolean
}

function Button({
  className,
  variant,
  size,
  asChild = false,
  loading = false,
  disabled,
  children,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button"

  if (asChild && loading) {
    console.warn('Button: loading prop is ignored when asChild is true')
  }

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      disabled={disabled || loading}
      {...props}
    >
      {asChild ? (
        children
      ) : (
        <>
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          {children}
        </>
      )}
    </Comp>
  )
}

export { Button, buttonVariants }
