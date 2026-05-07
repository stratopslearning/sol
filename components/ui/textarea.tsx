import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-20 w-full rounded-md border border-rule bg-surface px-3 py-2.5",
        "text-sm text-ink placeholder:text-ink-faint font-sans leading-relaxed",
        "outline-none transition-colors duration-150",
        "selection:bg-brand-soft selection:text-ink",
        "hover:border-rule-strong",
        "focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/20",
        "aria-invalid:border-danger aria-invalid:ring-2 aria-invalid:ring-danger/20",
        "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-surface-sunken",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
