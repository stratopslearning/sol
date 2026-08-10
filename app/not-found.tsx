"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { MeshGradient } from "@paper-design/shaders-react";
import { useTheme } from "next-themes";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

import { Button } from "@/components/ui/button";
import { appPath } from "@/lib/basePath";
import { getSolMeshHeroProps } from "@/lib/heroShaderColors";
import { cn } from "@/lib/utils";

gsap.registerPlugin(useGSAP);

export default function NotFound() {
  const rootRef = useRef<HTMLElement>(null);
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const dark = mounted && resolvedTheme === "dark";
  const shaderProps = useMemo(
    () => getSolMeshHeroProps({ reducedMotion, dark }),
    [reducedMotion, dark],
  );

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
        tl.from('[data-nf="watermark"]', {
          opacity: 0,
          scale: 0.92,
          duration: 1.1,
        })
          .from(
            '[data-nf="brand"]',
            { opacity: 0, y: 12, duration: 0.45 },
            "-=0.55",
          )
          .from(
            '[data-nf="title"]',
            { opacity: 0, y: 22, duration: 0.55 },
            "-=0.25",
          )
          .from(
            '[data-nf="copy"]',
            { opacity: 0, y: 16, duration: 0.45 },
            "-=0.28",
          )
          .from(
            '[data-nf="actions"]',
            { opacity: 0, y: 14, duration: 0.45 },
            "-=0.22",
          );
        return () => {
          tl.kill();
        };
      });
      return () => mm.revert();
    },
    { scope: rootRef },
  );

  return (
    <main
      ref={rootRef}
      className="relative isolate flex min-h-[100svh] overflow-hidden bg-paper"
    >
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <MeshGradient
          className="absolute inset-0 h-full w-full"
          {...shaderProps.mesh}
        />
        <MeshGradient
          className="absolute inset-0 h-full w-full"
          {...shaderProps.meshAccent}
        />
        <div
          className={cn(
            "absolute inset-0",
            "bg-[radial-gradient(ellipse_at_center,color-mix(in_oklch,var(--paper)_82%,transparent)_0%,color-mix(in_oklch,var(--paper)_45%,transparent)_48%,transparent_78%)]",
          )}
        />
        <div className="absolute inset-x-0 top-0 h-28 bg-[linear-gradient(to_bottom,color-mix(in_oklch,var(--paper)_70%,transparent),transparent)]" />
        <div className="absolute inset-x-0 bottom-0 h-32 bg-[linear-gradient(to_top,color-mix(in_oklch,var(--paper)_55%,transparent),transparent)]" />
      </div>

      <p data-nf="watermark" className="not-found-watermark" aria-hidden>
        404
      </p>

      <div className="relative z-10 mx-auto flex w-full max-w-[1200px] flex-1 flex-col justify-center px-4 py-24 md:px-8">
        <div className="mx-auto flex max-w-xl flex-col items-center text-center">
          <p
            data-nf="brand"
            className="font-display text-brand"
            style={{
              fontSize: "clamp(1.35rem, 2.5vw, 1.75rem)",
              letterSpacing: "-0.03em",
              fontVariationSettings: '"opsz" 36, "SOFT" 50',
            }}
          >
            SOL
          </p>

          <h1
            data-nf="title"
            className="mt-5 font-display text-ink text-balance"
            style={{
              fontSize: "clamp(2.5rem, 6vw, 4rem)",
              lineHeight: 1.05,
              letterSpacing: "-0.035em",
              fontVariationSettings: '"opsz" 96, "SOFT" 40',
            }}
          >
            This page
            <br />
            <span
              className="text-brand"
              style={{ fontVariationSettings: '"opsz" 96, "SOFT" 60' }}
            >
              isn’t on the syllabus.
            </span>
          </h1>

          <p
            data-nf="copy"
            className="mt-5 max-w-[38ch] text-base leading-relaxed text-ink-muted text-balance md:text-lg"
          >
            The link may be outdated, mistyped, or the course material moved.
            Head home and pick up where you left off.
          </p>

          <div
            data-nf="actions"
            className="mt-10 flex flex-col items-center gap-3 sm:flex-row"
          >
            <Button asChild size="lg">
              <Link href={appPath("/")}>
                <ArrowLeft className="h-4 w-4" />
                Back to homepage
              </Link>
            </Button>
            <Button asChild size="lg" variant="ghost">
              <Link href={appPath("/login")}>
                Sign in
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}
