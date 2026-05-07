"use client"

import * as React from "react"
import * as SwitchPrimitive from "@radix-ui/react-switch"

import { cn } from "@/lib/utils"

function Switch({
  className,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "peer inline-flex h-5 w-9 shrink-0 items-center rounded-full border border-rule transition-colors outline-none",
        "data-[state=checked]:bg-brand data-[state=checked]:border-brand",
        "data-[state=unchecked]:bg-surface-sunken",
        "focus-visible:ring-2 focus-visible:ring-brand/30 focus-visible:ring-offset-2 focus-visible:ring-offset-paper",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          "pointer-events-none block size-4 rounded-full ring-0 transition-transform",
          "data-[state=checked]:translate-x-[calc(100%-2px)] data-[state=checked]:bg-paper",
          "data-[state=unchecked]:translate-x-0.5 data-[state=unchecked]:bg-surface paper-shadow"
        )}
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
