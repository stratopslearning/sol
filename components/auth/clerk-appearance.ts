import type { Appearance } from "@clerk/types";

/**
 * Clerk theming — flush inside the SOL auth card.
 * Standard field layout: label row (label | action), full-width input,
 * show-password control inside the input group.
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
    rootBox: "w-full max-w-full m-0 overflow-visible",
    card: "bg-transparent shadow-none border-0 p-0 m-0 w-full max-w-full overflow-visible",
    cardBox:
      "bg-transparent shadow-none border-0 p-0 m-0 w-full max-w-full gap-5 overflow-visible",
    scrollBox:
      "bg-transparent shadow-none border-0 p-0 m-0 w-full max-w-full overflow-visible h-auto max-h-none",
    main: "gap-5 bg-transparent shadow-none w-full max-w-full overflow-visible",
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
    form: "flex flex-col gap-4 w-full max-w-full m-0 p-0 overflow-visible",
    formContainer: "w-full max-w-full m-0 p-0 overflow-visible",
    formFields: "flex flex-col gap-4 w-full max-w-full overflow-visible",
    formField: "flex flex-col w-full max-w-full min-w-0 m-0 p-0 overflow-visible",
    formFieldRow: "flex flex-col gap-4 w-full max-w-full m-0 p-0 overflow-visible",
    formFieldLabelRow:
      "flex w-full max-w-full min-w-0 items-center justify-between gap-3 m-0 mb-1.5 p-0 overflow-visible",
    formFieldLabel:
      "text-xs font-medium text-ink-muted font-sans normal-case tracking-normal leading-snug m-0 p-0 overflow-visible whitespace-nowrap text-left",
    formFieldAction:
      "text-xs font-medium text-brand hover:text-brand-hover shrink-0 whitespace-nowrap m-0 p-0 overflow-visible text-right",
    formFieldInputGroup: "relative flex w-full max-w-full items-center",
    formFieldInputList: "gap-4 w-full",
    formFieldInput:
      "h-11 w-full min-w-0 bg-surface-sunken border border-transparent text-ink rounded-[0.625rem] pl-3.5 pr-11 text-sm placeholder:text-ink-faint focus-visible:border-brand/40 focus-visible:bg-surface focus-visible:ring-2 focus-visible:ring-brand/15 shadow-none transition-colors box-border",
    formFieldInputShowPasswordButton:
      "absolute right-1.5 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-ink-faint hover:text-ink hover:bg-surface/80",
    formFieldInputShowPasswordIcon: "h-4 w-4",
    formButtonPrimary:
      "bg-brand text-brand-foreground hover:bg-brand-hover normal-case font-medium rounded-[0.625rem] h-11 w-full text-sm transition-colors shadow-none mt-1",
    footer:
      "bg-transparent border-0 border-t border-rule/80 shadow-none pt-5 mt-1 w-full",
    footerAction: "flex justify-center py-0 w-full",
    footerActionText: "text-sm text-ink-muted",
    footerActionLink:
      "text-brand hover:text-brand-hover font-medium underline-offset-4",
    footerPages: { display: "none" },
    footerPagesLink: { display: "none" },
    identityPreview:
      "bg-surface-sunken border border-rule/60 rounded-[0.625rem] shadow-none",
    identityPreviewText: "text-ink",
    identityPreviewEditButton: "text-brand hover:text-brand-hover",
    formResendCodeLink: "text-brand hover:text-brand-hover",
    otpCodeFieldInput:
      "border border-transparent bg-surface-sunken text-ink rounded-[0.625rem] focus:border-brand/40 focus:ring-2 focus:ring-brand/15 shadow-none",
    formFieldErrorText: "text-danger text-xs mt-1.5 leading-snug text-left",
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
