export type ShortcutScope = "global" | "authoring";

export type ShortcutDef = {
  id: string;
  scope: ShortcutScope;
  /** Display string, e.g. "⌘K" or "g then h". Use ⌘; UI swaps to Ctrl on non-Mac. */
  keys: string;
  label: string;
  group: string;
};

/** Nav item keys used by `g` then letter chords (ROLE_CONFIG keys). */
export const G_CHORD_NAV: Record<string, string> = {
  h: "dashboard",
  k: "knowledge",
  a: "authoring",
  s: "assignments",
  t: "attention",
  r: "quiz-results",
  c: "courses",
  w: "workspace",
};

export const SHORTCUTS: ShortcutDef[] = [
  // Global
  {
    id: "jump-slash",
    scope: "global",
    keys: "/",
    label: "Focus Jump to",
    group: "Navigation",
  },
  {
    id: "jump-mod-k",
    scope: "global",
    keys: "⌘K",
    label: "Focus Jump to",
    group: "Navigation",
  },
  {
    id: "sidebar-toggle",
    scope: "global",
    keys: "⌘[",
    label: "Collapse / expand sidebar",
    group: "Navigation",
  },
  {
    id: "help",
    scope: "global",
    keys: "⌘/",
    label: "Keyboard shortcuts",
    group: "Navigation",
  },
  {
    id: "esc-global",
    scope: "global",
    keys: "Esc",
    label: "Clear Jump to / close dialogs",
    group: "Navigation",
  },
  {
    id: "g-h",
    scope: "global",
    keys: "g then h",
    label: "Go to Overview",
    group: "Go to",
  },
  {
    id: "g-k",
    scope: "global",
    keys: "g then k",
    label: "Go to Knowledge",
    group: "Go to",
  },
  {
    id: "g-a",
    scope: "global",
    keys: "g then a",
    label: "Go to Authoring",
    group: "Go to",
  },
  {
    id: "g-s",
    scope: "global",
    keys: "g then s",
    label: "Go to Assignments",
    group: "Go to",
  },
  {
    id: "g-t",
    scope: "global",
    keys: "g then t",
    label: "Go to Attention",
    group: "Go to",
  },
  {
    id: "g-r",
    scope: "global",
    keys: "g then r",
    label: "Go to Results",
    group: "Go to",
  },
  {
    id: "g-c",
    scope: "global",
    keys: "g then c",
    label: "Go to Courses",
    group: "Go to",
  },
  {
    id: "g-w",
    scope: "global",
    keys: "g then w",
    label: "Go to Workspace",
    group: "Go to",
  },

  // Authoring
  {
    id: "auth-send-enter",
    scope: "authoring",
    keys: "Enter",
    label: "Send message",
    group: "Authoring",
  },
  {
    id: "auth-newline",
    scope: "authoring",
    keys: "Shift+Enter",
    label: "New line",
    group: "Authoring",
  },
  {
    id: "auth-send-mod",
    scope: "authoring",
    keys: "⌘Enter",
    label: "Send message",
    group: "Authoring",
  },
  {
    id: "auth-esc",
    scope: "authoring",
    keys: "Esc",
    label: "Stop / close outline / blur composer",
    group: "Authoring",
  },
  {
    id: "auth-focus-composer",
    scope: "authoring",
    keys: "⌘J",
    label: "Focus reply composer",
    group: "Authoring",
  },
  {
    id: "auth-toggle-artifact",
    scope: "authoring",
    keys: "⌘.",
    label: "Toggle outline artifact",
    group: "Authoring",
  },
  {
    id: "auth-outline-tab",
    scope: "authoring",
    keys: "⌘⇧O",
    label: "Open outline tab",
    group: "Authoring",
  },
  {
    id: "auth-new-chat",
    scope: "authoring",
    keys: "⌘N",
    label: "New chat",
    group: "Authoring",
  },
  {
    id: "auth-history",
    scope: "authoring",
    keys: "⌘⇧H",
    label: "Open chat history",
    group: "Authoring",
  },
  {
    id: "auth-upload",
    scope: "authoring",
    keys: "⌘U",
    label: "Upload / add files",
    group: "Authoring",
  },
  {
    id: "auth-edit-last",
    scope: "authoring",
    keys: "↑",
    label: "Edit last user message (empty composer)",
    group: "Authoring",
  },
];

export function shortcutsForScopes(scopes: ShortcutScope[]): ShortcutDef[] {
  const set = new Set(scopes);
  return SHORTCUTS.filter((s) => set.has(s.scope));
}

export function isMacPlatform(): boolean {
  if (typeof navigator === "undefined") return true;
  return /Mac|iPhone|iPad|iPod/i.test(navigator.platform || navigator.userAgent);
}

/** ⌘ on Mac, Ctrl elsewhere. */
export function isModKey(
  e: Pick<KeyboardEvent, "metaKey" | "ctrlKey">,
): boolean {
  return isMacPlatform() ? e.metaKey : e.ctrlKey;
}

export function formatShortcutKeys(keys: string, mac = isMacPlatform()): string {
  if (mac) return keys;
  return keys
    .replaceAll("⌘", "Ctrl+")
    .replaceAll("⇧", "Shift+")
    .replace(/Ctrl\+\+/g, "Ctrl+/");
}

export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  return Boolean(target.closest("[contenteditable='true']"));
}

export function groupShortcuts(defs: ShortcutDef[]): Array<{
  group: string;
  items: ShortcutDef[];
}> {
  const order: string[] = [];
  const map = new Map<string, ShortcutDef[]>();
  for (const def of defs) {
    if (!map.has(def.group)) {
      map.set(def.group, []);
      order.push(def.group);
    }
    map.get(def.group)!.push(def);
  }
  return order.map((group) => ({ group, items: map.get(group)! }));
}
