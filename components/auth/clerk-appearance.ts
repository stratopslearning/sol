import type { Appearance } from "@clerk/types";

/**
 * Clerk theming — flush inside the SOL auth card.
 */
export const clerkAppearance: Appearance = {
  layout: {
    socialButtonsPlacement: "top",
    socialButtonsVariant: "auto",
  },
  variables: {
    colorPrimary: "var(--brand)",
    colorText: "var(--ink)",
    colorTextSecondary: "var(--ink-muted)",
    colorBackground: "transparent",
    colorInputBackground: "var(--surface-sunken)",
    colorInputText: "var(--ink)",
    colorDanger: "var(--danger)",
    colorSuccess: "var(--success)",
    colorNeutral: "var(--ink)",
    borderRadius: "0.625rem",
    fontFamily: "var(--font-instrument-sans), system-ui, sans-serif",
    spacingUnit: "1rem",
  },
  elements: {
    rootBox: "w-full max-w-full mx-0",
    card: "bg-transparent shadow-none border-0 p-0 m-0 w-full max-w-full",
    cardBox: "bg-transparent shadow-none border-0 p-0 m-0 w-full max-w-full gap-5",
    scrollBox: "bg-transparent shadow-none border-0 p-0 m-0 w-full",
    main: "gap-5 bg-transparent shadow-none",
    logoBox: { display: "none" },
    logoImage: { display: "none" },
    header: { display: "none" },
    headerTitle: { display: "none" },
    headerSubtitle: { display: "none" },
    socialButtonsRoot: "w-full",
    socialButtons: "grid grid-cols-2 gap-3 w-full",
    socialButtonsIconButton:
      "h-11 border border-rule bg-surface text-ink hover:bg-surface-elevated hover:border-rule-strong transition-colors rounded-[0.625rem] font-sans normal-case shadow-none [&_*]:text-ink",
    socialButtonsBlockButton:
      "h-11 border border-rule bg-surface text-ink hover:bg-surface-elevated hover:border-rule-strong transition-colors rounded-[0.625rem] font-sans normal-case shadow-none [&_*]:text-ink",
    socialButtonsBlockButtonText: "font-sans text-sm font-medium text-ink",
    dividerRow: "my-1 w-full gap-3",
    dividerLine: "bg-rule flex-1 h-px",
    dividerText:
      "text-xs text-ink-faint font-normal normal-case tracking-normal px-1 shrink-0",
    form: "gap-4 w-full",
    formFields: "gap-4 w-full",
    formFieldRow: "gap-3 w-full grid grid-cols-2",
    formFieldLabel:
      "text-xs font-medium text-ink-muted mb-1.5 font-sans normal-case tracking-normal",
    formFieldInputList: "gap-4",
    formFieldInput:
      "h-11 w-full min-w-0 bg-surface-sunken border border-transparent text-ink rounded-[0.625rem] px-3.5 text-sm placeholder:text-ink-faint focus-visible:border-brand/40 focus-visible:bg-surface focus-visible:ring-2 focus-visible:ring-brand/15 shadow-none transition-colors",
    formButtonPrimary:
      "bg-brand text-brand-foreground hover:bg-brand-hover normal-case font-medium rounded-[0.625rem] h-11 w-full text-sm transition-colors shadow-none mt-1",
    footer:
      "bg-transparent border-0 border-t border-rule/80 shadow-none pt-5 mt-1 w-full",
    footerAction: "justify-center py-0 w-full",
    footerActionText: "text-sm text-ink-muted",
    footerActionLink:
      "text-brand hover:text-brand-hover font-medium underline-offset-4",
    footerPages: { display: "none" },
    footerPagesLink: { display: "none" },
    identityPreview: "bg-surface-sunken border border-rule/60 rounded-[0.625rem] shadow-none",
    identityPreviewText: "text-ink",
    identityPreviewEditButton: "text-brand hover:text-brand-hover",
    formResendCodeLink: "text-brand hover:text-brand-hover",
    otpCodeFieldInput:
      "border border-transparent bg-surface-sunken text-ink rounded-[0.625rem] focus:border-brand/40 focus:ring-2 focus:ring-brand/15 shadow-none",
    formFieldErrorText: "text-danger text-xs mt-1",
    alert: "bg-surface-sunken border border-rule/60 rounded-[0.625rem] shadow-none",
    alertText: "text-sm text-ink",
    userButtonPopoverCard: "bg-surface border border-rule paper-shadow-lg",
    userButtonPopoverActionButton:
      "text-ink hover:bg-surface-sunken transition-colors",
    userButtonPopoverActionButtonText: "text-ink",
    userButtonPopoverFooter: "border-rule",
    avatarBox: "border border-rule",
  },
};
