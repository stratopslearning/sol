import type { Appearance } from "@clerk/types";

/**
 * Clerk theming: academic / Vestris-adjacent, flush inside the SOL auth card.
 * Cream paper, olive primary, soft rounded controls; centered social + footer.
 */
export const clerkAppearance: Appearance = {
  layout: {
    socialButtonsPlacement: "top",
    socialButtonsVariant: "blockButton",
  },
  variables: {
    colorPrimary: "var(--brand)",
    colorText: "var(--ink)",
    colorTextSecondary: "var(--ink-muted)",
    colorBackground: "transparent",
    colorInputBackground: "var(--surface)",
    colorInputText: "var(--ink)",
    colorDanger: "var(--danger)",
    colorSuccess: "var(--success)",
    colorNeutral: "var(--ink)",
    borderRadius: "0.85rem",
    fontFamily: "var(--font-geist-sans), var(--font-inter), system-ui, sans-serif",
    fontFamilyButtons:
      "var(--font-geist-sans), var(--font-inter), system-ui, sans-serif",
    spacingUnit: "0.95rem",
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
    socialButtons: "grid grid-cols-2 gap-2.5 w-full",
    socialButtonsIconButton:
      "h-11 border border-rule bg-paper text-ink hover:bg-surface-elevated hover:border-rule-strong transition-colors rounded-full font-sans normal-case shadow-none [&_*]:text-ink",
    socialButtonsBlockButton:
      "h-11 border border-rule bg-paper text-ink hover:bg-surface-elevated hover:border-rule-strong transition-colors rounded-full font-sans normal-case shadow-none [&_*]:text-ink justify-center",
    socialButtonsBlockButtonText:
      "font-sans text-sm font-medium text-ink tracking-tight",
    dividerRow: "my-1 w-full gap-3",
    dividerLine: "bg-rule flex-1 h-px",
    dividerText:
      "text-[0.7rem] uppercase tracking-[0.12em] text-ink-faint font-medium px-1 shrink-0",
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
      "h-11 w-full min-w-0 bg-paper border border-rule text-ink rounded-full pl-4 pr-11 text-sm placeholder:text-ink-faint focus-visible:border-brand/45 focus-visible:bg-surface focus-visible:ring-2 focus-visible:ring-brand/12 shadow-none transition-colors box-border",
    formFieldInputShowPasswordButton:
      "absolute right-1.5 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-ink-faint hover:text-ink hover:bg-surface-sunken/80",
    formFieldInputShowPasswordIcon: "h-4 w-4",
    formButtonPrimary:
      "bg-brand text-brand-foreground hover:bg-brand-hover normal-case font-medium rounded-full h-11 w-full text-sm transition-colors shadow-none mt-1",
    footer:
      "bg-transparent border-0 border-t border-rule/70 shadow-none pt-5 mt-1 w-full",
    footerAction: "flex justify-center py-0 w-full text-center",
    footerActionText: "text-sm text-ink-muted",
    footerActionLink:
      "text-brand hover:text-brand-hover font-medium underline-offset-4",
    footerPages: { display: "none" },
    footerPagesLink: { display: "none" },
    identityPreview:
      "bg-paper border border-rule rounded-full shadow-none justify-center",
    identityPreviewText: "text-ink",
    identityPreviewEditButton: "text-brand hover:text-brand-hover",
    formResendCodeLink: "text-brand hover:text-brand-hover",
    otpCodeFieldInput:
      "border border-rule bg-paper text-ink rounded-[0.85rem] focus:border-brand/45 focus:ring-2 focus:ring-brand/12 shadow-none",
    formFieldErrorText: "text-danger text-xs mt-1.5 leading-snug text-left",
    alert: "bg-paper border border-rule rounded-[0.85rem] shadow-none text-left",
    alertText: "text-sm text-ink",
    userButtonPopoverCard:
      "bg-surface border border-rule shadow-paper-lg rounded-2xl",
    userButtonPopoverActionButton:
      "text-ink hover:bg-surface-sunken rounded-xl transition-colors",
    userButtonPopoverActionButtonText: "text-ink",
    userButtonPopoverFooter: "border-rule",
    avatarBox: "border border-rule bg-brand-soft rounded-full shadow-none",
    userButtonAvatarBox: "border border-rule bg-brand-soft rounded-full",
  },
};
