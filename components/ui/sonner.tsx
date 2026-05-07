"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, ToasterProps } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      style={
        {
          "--normal-bg": "var(--surface)",
          "--normal-text": "var(--ink)",
          "--normal-border": "var(--rule)",
          "--success-bg": "var(--success-soft)",
          "--success-border": "var(--success)",
          "--success-text": "var(--success)",
          "--error-bg": "var(--danger-soft)",
          "--error-border": "var(--danger)",
          "--error-text": "var(--danger)",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
