"use client";

import * as React from "react";

import {
  closestIconTrigger,
  startIconsIn,
  stopIconsIn,
} from "@/components/icons/runtime";

/**
 * Site-wide: hovering or pressing a button/link animates lucide-animated
 * icons inside it. Active icons (`data-icon-active="true"`) stay playing.
 */
export function IconInteractionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  React.useEffect(() => {
    const pressed = new WeakSet<Element>();

    function onOver(e: PointerEvent) {
      const trigger = closestIconTrigger(e.target);
      const from = closestIconTrigger(e.relatedTarget);
      if (!trigger || trigger === from) return;
      startIconsIn(trigger);
    }

    function onOut(e: PointerEvent) {
      const trigger = closestIconTrigger(e.target);
      const to = closestIconTrigger(e.relatedTarget);
      if (!trigger || trigger === to) return;
      if (pressed.has(trigger)) return;
      stopIconsIn(trigger);
    }

    function onDown(e: PointerEvent) {
      const trigger = closestIconTrigger(e.target);
      if (!trigger) return;
      pressed.add(trigger);
      startIconsIn(trigger);
    }

    function onUp(e: PointerEvent) {
      const trigger = closestIconTrigger(e.target);
      if (!trigger) return;
      pressed.delete(trigger);
      // Keep playing if pointer is still over the trigger.
      if (!trigger.matches(":hover")) stopIconsIn(trigger);
    }

    function onCancel(e: PointerEvent) {
      const trigger = closestIconTrigger(e.target);
      if (!trigger) return;
      pressed.delete(trigger);
      stopIconsIn(trigger);
    }

    document.addEventListener("pointerover", onOver, true);
    document.addEventListener("pointerout", onOut, true);
    document.addEventListener("pointerdown", onDown, true);
    document.addEventListener("pointerup", onUp, true);
    document.addEventListener("pointercancel", onCancel, true);
    return () => {
      document.removeEventListener("pointerover", onOver, true);
      document.removeEventListener("pointerout", onOut, true);
      document.removeEventListener("pointerdown", onDown, true);
      document.removeEventListener("pointerup", onUp, true);
      document.removeEventListener("pointercancel", onCancel, true);
    };
  }, []);

  return children;
}
