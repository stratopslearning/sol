"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { PaperTexture } from "@paper-design/shaders-react";
import { useTheme } from "next-themes";

/**
 * Paper texture for marketing + docs surfaces (not the hero mesh).
 * Params from https://shaders.paper.design/paper-texture (seed 5.8 preset).
 */
const TEXTURE = {
  contrast: 0.3,
  roughness: 0.4,
  fiber: 0.3,
  fiberSize: 0.2,
  crumples: 0.3,
  crumpleSize: 0.35,
  folds: 0.65,
  foldCount: 5,
  drops: 0.2,
  fade: 0,
  seed: 5.8,
  scale: 0.6,
  fit: "cover" as const,
};

export function PaperTexturedRegion({ children }: { children: ReactNode }) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const dark = mounted && resolvedTheme === "dark";

  return (
    <div className="relative isolate">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
      >
        <PaperTexture
          className="absolute inset-0 h-full w-full"
          colorBack={dark ? "#141210" : "#ffffff"}
          colorFront={dark ? "#3d4540" : "#9fadbc"}
          {...TEXTURE}
        />
        {/* Keep type readable; let fiber/folds still read through */}
        <div
          className={
            dark
              ? "absolute inset-0 bg-[color-mix(in_oklch,var(--paper)_55%,transparent)]"
              : "absolute inset-0 bg-[color-mix(in_oklch,var(--paper)_42%,transparent)]"
          }
        />
      </div>
      {children}
    </div>
  );
}
