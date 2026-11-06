"use client";

import * as React from "react";

import { useShortcutsPageScope } from "@/components/shortcuts/ShortcutsProvider";
import { isModKey, isTypingTarget } from "@/lib/shortcuts/registry";

type Options = {
  enabled?: boolean;
  composerRef: React.RefObject<HTMLTextAreaElement | null>;
  chatInput: string;
  setChatInput: (value: string) => void;
  lastUserMessage: string | null;
  streaming: boolean;
  canSend: boolean;
  artifactOpen: boolean;
  onStop: () => void;
  onSend: () => void;
  onToggleArtifact: () => void;
  onOpenOutline: () => void;
  onCloseArtifact: () => void;
  onNewChat: () => void;
  onOpenHistory: () => void;
  onOpenUpload: () => void;
};

function isComposerTarget(
  target: EventTarget | null,
  composer: HTMLTextAreaElement | null,
): boolean {
  return Boolean(composer && target instanceof Node && composer.contains(target));
}

export function useAuthoringShortcuts({
  enabled = true,
  composerRef,
  chatInput,
  setChatInput,
  lastUserMessage,
  streaming,
  canSend,
  artifactOpen,
  onStop,
  onSend,
  onToggleArtifact,
  onOpenOutline,
  onCloseArtifact,
  onNewChat,
  onOpenHistory,
  onOpenUpload,
}: Options) {
  useShortcutsPageScope(enabled ? "authoring" : null);

  const optsRef = React.useRef({
    chatInput,
    setChatInput,
    lastUserMessage,
    streaming,
    canSend,
    artifactOpen,
    onStop,
    onSend,
    onToggleArtifact,
    onOpenOutline,
    onCloseArtifact,
    onNewChat,
    onOpenHistory,
    onOpenUpload,
  });
  optsRef.current = {
    chatInput,
    setChatInput,
    lastUserMessage,
    streaming,
    canSend,
    artifactOpen,
    onStop,
    onSend,
    onToggleArtifact,
    onOpenOutline,
    onCloseArtifact,
    onNewChat,
    onOpenHistory,
    onOpenUpload,
  };

  React.useEffect(() => {
    if (!enabled) return;

    function onKey(e: KeyboardEvent) {
      const o = optsRef.current;
      const composer = composerRef.current;
      const inComposer = isComposerTarget(e.target, composer);
      const typingElsewhere = isTypingTarget(e.target) && !inComposer;

      // Esc: stop → close artifact → blur composer (let modal dialogs win)
      if (e.key === "Escape") {
        if (document.querySelector('[data-slot="dialog-content"]')) return;
        if (o.streaming) {
          e.preventDefault();
          e.stopPropagation();
          o.onStop();
          return;
        }
        if (o.artifactOpen) {
          e.preventDefault();
          e.stopPropagation();
          o.onCloseArtifact();
          return;
        }
        if (inComposer) {
          e.preventDefault();
          composer?.blur();
          return;
        }
        return;
      }

      // ↑ empty composer → edit last user message
      if (
        e.key === "ArrowUp" &&
        inComposer &&
        !e.metaKey &&
        !e.ctrlKey &&
        !e.altKey &&
        !o.chatInput.trim() &&
        o.lastUserMessage
      ) {
        e.preventDefault();
        o.setChatInput(o.lastUserMessage);
        requestAnimationFrame(() => {
          const el = composerRef.current;
          if (!el) return;
          const len = el.value.length;
          el.setSelectionRange(len, len);
        });
        return;
      }

      if (!isModKey(e) || e.altKey) return;
      if (typingElsewhere) return;

      const key = e.key.toLowerCase();

      // ⌘Enter send
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        if (o.canSend) o.onSend();
        return;
      }

      // ⌘J focus composer
      if (key === "j" && !e.shiftKey) {
        e.preventDefault();
        composer?.focus();
        return;
      }

      // ⌘. toggle artifact
      if (e.key === "." && !e.shiftKey) {
        e.preventDefault();
        o.onToggleArtifact();
        return;
      }

      // ⌘⇧O open outline
      if (key === "o" && e.shiftKey) {
        e.preventDefault();
        o.onOpenOutline();
        return;
      }

      // ⌘N new chat
      if (key === "n" && !e.shiftKey) {
        e.preventDefault();
        o.onNewChat();
        return;
      }

      // ⌘⇧H history
      if (key === "h" && e.shiftKey) {
        e.preventDefault();
        o.onOpenHistory();
        return;
      }

      // ⌘U upload
      if (key === "u" && !e.shiftKey) {
        e.preventDefault();
        o.onOpenUpload();
      }
    }

    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [composerRef, enabled]);
}
