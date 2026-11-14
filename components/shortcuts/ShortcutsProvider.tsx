"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import {
  G_CHORD_NAV,
  isModKey,
  isTypingTarget,
  type ShortcutScope,
} from "@/lib/shortcuts/registry";
import { ROLE_CONFIG, type AppRole } from "@/lib/nav-config";

import { ShortcutsHelpDialog } from "./ShortcutsHelpDialog";

type JumpToApi = {
  focus: () => void;
  clear: () => void;
  isFocused: () => boolean;
};

type ShortcutsContextValue = {
  pageScope: ShortcutScope | null;
  setPageScope: (scope: ShortcutScope | null) => void;
  helpOpen: boolean;
  setHelpOpen: (open: boolean) => void;
  registerJumpTo: (api: JumpToApi | null) => void;
  registerSidebarToggle: (fn: (() => void) | null) => void;
  focusJumpTo: () => void;
};

const ShortcutsContext = React.createContext<ShortcutsContextValue | null>(
  null,
);

const G_CHORD_MS = 1000;

export function ShortcutsProvider({
  role,
  children,
}: {
  role: AppRole;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [pageScope, setPageScope] = React.useState<ShortcutScope | null>(null);
  const [helpOpen, setHelpOpen] = React.useState(false);
  const jumpToRef = React.useRef<JumpToApi | null>(null);
  const sidebarToggleRef = React.useRef<(() => void) | null>(null);
  const gPendingRef = React.useRef(false);
  const gTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const registerJumpTo = React.useCallback((api: JumpToApi | null) => {
    jumpToRef.current = api;
  }, []);

  const registerSidebarToggle = React.useCallback((fn: (() => void) | null) => {
    sidebarToggleRef.current = fn;
  }, []);

  const focusJumpTo = React.useCallback(() => {
    jumpToRef.current?.focus();
  }, []);

  const clearGChord = React.useCallback(() => {
    gPendingRef.current = false;
    if (gTimerRef.current) {
      clearTimeout(gTimerRef.current);
      gTimerRef.current = null;
    }
  }, []);

  const navigateChord = React.useCallback(
    (letter: string) => {
      const navKey = G_CHORD_NAV[letter.toLowerCase()];
      if (!navKey) return false;
      const item = ROLE_CONFIG[role].items.find((i) => i.key === navKey);
      if (!item) return false;
      router.push(item.href);
      return true;
    },
    [role, router],
  );

  const helpOpenRef = React.useRef(helpOpen);
  helpOpenRef.current = helpOpen;

  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const key = typeof e.key === "string" ? e.key : "";
      if (!key) return;

      // Help: ⌘/
      if (key === "/" && isModKey(e) && !e.altKey && !e.shiftKey) {
        e.preventDefault();
        clearGChord();
        setHelpOpen((open) => !open);
        return;
      }

      // Jump to: ⌘K
      if (
        key.toLowerCase() === "k" &&
        isModKey(e) &&
        !e.altKey &&
        !e.shiftKey
      ) {
        e.preventDefault();
        clearGChord();
        jumpToRef.current?.focus();
        return;
      }

      // Sidebar: ⌘[
      if (key === "[" && isModKey(e) && !e.altKey && !e.shiftKey) {
        e.preventDefault();
        clearGChord();
        sidebarToggleRef.current?.();
        return;
      }

      // Jump to: /
      if (key === "/" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        if (isTypingTarget(e.target)) return;
        e.preventDefault();
        clearGChord();
        jumpToRef.current?.focus();
        return;
      }

      // Esc: clear Jump to when focused (dialogs handle their own Esc)
      if (key === "Escape") {
        clearGChord();
        if (!helpOpenRef.current && jumpToRef.current?.isFocused()) {
          e.preventDefault();
          jumpToRef.current.clear();
          return;
        }
        return;
      }

      // g-then chords
      if (gPendingRef.current) {
        if (key === "Escape") {
          e.preventDefault();
          clearGChord();
          return;
        }
        if (e.metaKey || e.ctrlKey || e.altKey) {
          clearGChord();
          return;
        }
        if (key.length === 1) {
          e.preventDefault();
          const letter = key.toLowerCase();
          clearGChord();
          navigateChord(letter);
          return;
        }
        clearGChord();
        return;
      }

      if (
        key.toLowerCase() === "g" &&
        !e.metaKey &&
        !e.ctrlKey &&
        !e.altKey &&
        !e.shiftKey
      ) {
        if (isTypingTarget(e.target)) return;
        e.preventDefault();
        gPendingRef.current = true;
        if (gTimerRef.current) clearTimeout(gTimerRef.current);
        gTimerRef.current = setTimeout(() => {
          gPendingRef.current = false;
          gTimerRef.current = null;
        }, G_CHORD_MS);
      }
    }

    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      clearGChord();
    };
  }, [clearGChord, navigateChord]);

  const value = React.useMemo<ShortcutsContextValue>(
    () => ({
      pageScope,
      setPageScope,
      helpOpen,
      setHelpOpen,
      registerJumpTo,
      registerSidebarToggle,
      focusJumpTo,
    }),
    [
      pageScope,
      helpOpen,
      registerJumpTo,
      registerSidebarToggle,
      focusJumpTo,
    ],
  );

  return (
    <ShortcutsContext.Provider value={value}>
      {children}
      <ShortcutsHelpDialog
        open={helpOpen}
        onOpenChange={setHelpOpen}
        pageScope={pageScope}
      />
    </ShortcutsContext.Provider>
  );
}

export function useShortcuts(): ShortcutsContextValue {
  const ctx = React.useContext(ShortcutsContext);
  if (!ctx) {
    throw new Error("useShortcuts must be used within ShortcutsProvider");
  }
  return ctx;
}

export function useShortcutsOptional(): ShortcutsContextValue | null {
  return React.useContext(ShortcutsContext);
}

/** Register a page-scoped shortcut layer while mounted. */
export function useShortcutsPageScope(scope: ShortcutScope | null) {
  const ctx = React.useContext(ShortcutsContext);
  React.useEffect(() => {
    if (!ctx) return;
    ctx.setPageScope(scope);
    return () => ctx.setPageScope(null);
  }, [ctx, scope]);
}
