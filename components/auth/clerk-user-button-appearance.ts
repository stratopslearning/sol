import type { Appearance } from "@clerk/types";

/** Shared UserButton / avatar chrome: academic cream + olive. */
export const clerkUserButtonAppearance: Appearance = {
  variables: {
    colorPrimary: "var(--brand)",
    colorText: "var(--ink)",
    colorTextSecondary: "var(--ink-muted)",
    colorBackground: "var(--surface)",
    colorNeutral: "var(--ink-muted)",
    colorDanger: "var(--danger)",
    borderRadius: "0.85rem",
    fontFamily: "var(--font-sans)",
  },
  elements: {
    userButtonTrigger:
      "rounded-full focus:shadow-none focus-visible:ring-2 focus-visible:ring-brand/25",
    userButtonAvatarBox:
      "w-8 h-8 rounded-full border border-rule bg-brand-soft shadow-none",
    userButtonAvatarImage: "rounded-full",
    avatarBox:
      "w-8 h-8 rounded-full border border-rule bg-brand-soft shadow-none",
    userButtonPopoverCard:
      "bg-surface border border-rule shadow-paper-lg rounded-2xl",
    userButtonPopoverMain: "bg-surface",
    userButtonPopoverActionButton:
      "text-ink hover:bg-surface-sunken rounded-xl transition-colors",
    userButtonPopoverActionButtonText: "text-ink font-sans",
    userButtonPopoverActionButtonIcon: "text-ink-muted",
    userButtonPopoverFooter: "border-t border-rule bg-surface-sunken/40",
    userPreviewMainIdentifier: "text-ink font-sans",
    userPreviewSecondaryIdentifier: "text-ink-muted font-sans",
  },
};
