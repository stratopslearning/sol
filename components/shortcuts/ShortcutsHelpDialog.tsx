"use client";

import * as React from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  formatShortcutKeys,
  groupShortcuts,
  isMacPlatform,
  shortcutsForScopes,
  type ShortcutScope,
} from "@/lib/shortcuts/registry";

export function ShortcutsHelpDialog({
  open,
  onOpenChange,
  pageScope,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pageScope: ShortcutScope | null;
}) {
  const mac = isMacPlatform();
  const scopes: ShortcutScope[] = pageScope
    ? ["global", pageScope]
    : ["global"];
  const groups = groupShortcuts(shortcutsForScopes(scopes));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(36rem,calc(100vh-2rem))] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
          <DialogDescription>
            {pageScope
              ? "Global shortcuts plus this page."
              : "Global shortcuts across the app."}{" "}
            Press {formatShortcutKeys("⌘/", mac)} anytime to reopen this list.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-5">
          {groups.map(({ group, items }) => (
            <section key={group}>
              <h3 className="mb-2 text-[0.625rem] font-semibold uppercase tracking-[0.14em] text-ink-faint">
                {group}
              </h3>
              <ul className="space-y-1.5">
                {items.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center justify-between gap-3 text-sm"
                  >
                    <span className="text-ink-muted">{item.label}</span>
                    <kbd className="shrink-0 rounded-md border border-rule bg-surface-sunken px-1.5 py-0.5 font-mono text-[11px] text-ink">
                      {formatShortcutKeys(item.keys, mac)}
                    </kbd>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
