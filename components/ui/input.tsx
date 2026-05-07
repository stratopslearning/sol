import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "flex h-10 w-full min-w-0 rounded-md border border-rule bg-surface px-3 py-2",
        "text-sm text-ink placeholder:text-ink-faint font-sans",
        "shadow-none outline-none",
        "transition-colors duration-150",
        "file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-ink",
        "selection:bg-brand-soft selection:text-ink",
        "hover:border-rule-strong",
        "focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/20 focus-visible:ring-offset-0",
        "aria-invalid:border-danger aria-invalid:ring-2 aria-invalid:ring-danger/20",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-surface-sunken",
        className
      )}
      {...props}
    />
  )
}

export { Input }
