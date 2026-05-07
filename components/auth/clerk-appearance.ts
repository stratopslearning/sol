import type { Appearance } from "@clerk/types";

/**
 * Clerk visual theming aligned with Refined Calm tokens.
 * Avoids hard-coded colors so it inherits both light and dark themes.
 */
export const clerkAppearance: Appearance = {
  variables: {
    colorPrimary: "oklch(0.42 0.075 162)",
    colorText: "var(--ink)",
    colorTextSecondary: "var(--ink-muted)",
    colorBackground: "var(--surface)",
    colorInputBackground: "var(--surface)",
    colorInputText: "var(--ink)",
    colorDanger: "var(--danger)",
    colorSuccess: "var(--success)",
    borderRadius: "0.375rem",
    fontFamily: "var(--font-instrument-sans), system-ui, sans-serif",
  },
  elements: {
    rootBox: "w-full",
    card: "bg-transparent shadow-none border-0 p-0",
    cardBox: "bg-transparent shadow-none border-0 p-0 w-full",
    headerTitle: "hidden",
    headerSubtitle: "hidden",
    socialButtonsBlockButton:
      "border border-rule bg-surface text-ink hover:bg-surface-sunken transition-colors h-10 rounded-md font-sans normal-case",
    socialButtonsBlockButtonText: "font-sans text-sm font-medium",
    dividerLine: "bg-rule",
    dividerText:
      "text-[0.6875rem] uppercase tracking-[0.14em] text-ink-faint font-semibold",
    formFieldLabel:
      "text-sm font-medium text-ink mb-1.5",
    formFieldInput:
      "h-10 bg-surface border border-rule text-ink rounded-md px-3 text-sm focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/20",
    formButtonPrimary:
      "bg-brand text-brand-foreground hover:bg-brand-hover normal-case font-medium rounded-md h-10 paper-shadow text-sm",
    footerActionText: "text-sm text-ink-muted",
    footerActionLink:
      "text-brand hover:text-brand-hover font-medium underline-offset-4",
    identityPreviewText: "text-ink",
    identityPreviewEditButton: "text-brand hover:text-brand-hover",
    formResendCodeLink: "text-brand hover:text-brand-hover",
    otpCodeFieldInput:
      "border-rule bg-surface text-ink focus:border-brand focus:ring-2 focus:ring-brand/20",
    formFieldErrorText: "text-danger text-xs",
    alertText: "text-sm text-ink",
    userButtonPopoverCard:
      "bg-surface border border-rule paper-shadow-lg",
    userButtonPopoverActionButton:
      "text-ink hover:bg-surface-sunken transition-colors",
    userButtonPopoverActionButtonText: "text-ink",
    userButtonPopoverFooter: "border-rule",
    avatarBox: "border border-rule",
  },
};
