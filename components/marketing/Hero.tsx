"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight } from "lucide-react";
import { useUser } from "@clerk/nextjs";
import { useTheme } from "next-themes";
import { MeshGradient } from "@paper-design/shaders-react";
import { motion, useReducedMotion as useFramerReducedMotion } from "framer-motion";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { SplitText } from "gsap/SplitText";

import { Button } from "@/components/ui/button";
import { apiUrl, withBasePath } from "@/lib/basePath";
import { paymentsEnabled } from "@/lib/featureFlags";
import { getSolMeshHeroProps } from "@/lib/heroShaderColors";
import { cn } from "@/lib/utils";

gsap.registerPlugin(useGSAP, SplitText);

interface DbUser {
  role?: "STUDENT" | "PROFESSOR" | "ADMIN";
  paid?: boolean;
}

export function Hero() {
  const { isSignedIn } = useUser();
  const [dbUser, setDbUser] = useState<DbUser | null>(null);
  const { resolvedTheme } = useTheme();
  const [reducedMotion, setReducedMotion] = useState(false);
  const framerReduce = useFramerReducedMotion();
  const rootRef = useRef<HTMLElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isSignedIn) return;
    fetch(apiUrl("/api/user"))
      .then((res) => res.json())
      .then((data) => setDbUser(data.user))
      .catch((err) => console.error("Error fetching user:", err));
  }, [isSignedIn]);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const studentEntitled = !paymentsEnabled() || Boolean(dbUser?.paid);
  const primaryHref =
    dbUser?.role === "ADMIN"
      ? withBasePath("/dashboard/admin")
      : dbUser?.role === "PROFESSOR"
        ? withBasePath("/dashboard/professor")
        : dbUser?.role === "STUDENT"
          ? studentEntitled
            ? withBasePath("/dashboard/student")
            : withBasePath("/payment")
          : null;

  const primaryLabel =
    dbUser?.role === "STUDENT" && !studentEntitled
      ? "Complete enrolment"
      : "Open your dashboard";

  const dark = mounted && resolvedTheme === "dark";
  const shaderProps = useMemo(
    () =>
      getSolMeshHeroProps({
        reducedMotion,
        dark,
      }),
    [reducedMotion, dark],
  );

  const motionOk = !reducedMotion && !framerReduce;

  useGSAP(
    () => {
      const headline = rootRef.current?.querySelector<HTMLElement>(
        '[data-hero="headline"]',
      );
      if (!headline) return;

      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const split = SplitText.create(headline, {
          type: "words",
          autoSplit: true,
          wordsClass: "hero-word",
          onSplit(self) {
            return gsap.from(self.words, {
              opacity: 0,
              yPercent: 30,
              stagger: 0.08,
              duration: 0.6,
              ease: "power3.out",
            });
          },
        });
        return () => split.revert();
      });

      return () => mm.revert();
    },
    { scope: rootRef },
  );

  return (
    <section
      ref={rootRef}
      aria-label="SOL. Quiz platform with AI grading for subjective answers."
      className="relative isolate min-h-[100svh] overflow-hidden bg-paper"
    >
      {/* Full-bleed mesh — dominant visual plane */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <MeshGradient
          className="absolute inset-0 h-full w-full"
          {...shaderProps.mesh}
        />
        <MeshGradient
          className="absolute inset-0 h-full w-full"
          {...shaderProps.meshAccent}
        />
        {/* Readability scrims — ink type + fixed nav stay crisp over the mesh */}
        <div
          className={cn(
            "absolute inset-0",
            "bg-[linear-gradient(105deg,color-mix(in_oklch,var(--paper)_88%,transparent)_0%,color-mix(in_oklch,var(--paper)_55%,transparent)_42%,transparent_78%)]",
          )}
        />
        <div className="absolute inset-x-0 top-0 h-28 bg-[linear-gradient(to_bottom,color-mix(in_oklch,var(--paper)_70%,transparent),transparent)]" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-[100svh] max-w-[1200px] flex-col justify-end px-4 pb-16 pt-28 md:px-8 md:pb-20 md:pt-32 lg:pb-24">
        <div className="max-w-2xl">
          <motion.p
            className="eyebrow mb-5 text-brand"
            initial={motionOk ? { opacity: 0, y: 12 } : false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            SOL Learning
          </motion.p>

          <h1
            data-hero="headline"
            className="font-display text-ink"
            style={{
              fontSize: "clamp(2.75rem, 7vw, 5.5rem)",
              lineHeight: 1.0,
              letterSpacing: "-0.035em",
              fontVariationSettings: '"opsz" 144, "SOFT" 40',
            }}
          >
            Less time grading,
            <br />
            <span
              className="text-brand"
              style={{
                fontVariationSettings: '"opsz" 144, "SOFT" 60',
              }}
            >
              more time teaching.
            </span>
          </h1>

          <motion.p
            className="mt-6 max-w-[56ch] text-base leading-relaxed text-ink-muted md:text-lg"
            initial={motionOk ? { opacity: 0, y: 14 } : false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.35 }}
          >
            The quiz is yours. The grading isn&apos;t.
          </motion.p>

          <motion.div
            className="mt-8 flex flex-col items-start gap-3 sm:flex-row sm:items-center"
            initial={motionOk ? { opacity: 0, y: 14 } : false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.5 }}
          >
            {isSignedIn && primaryHref ? (
              <Button asChild size="lg">
                <a href={primaryHref}>
                  {primaryLabel}
                  <ArrowRight className="h-4 w-4" />
                </a>
              </Button>
            ) : (
              <Button asChild size="lg">
                <a href={withBasePath("/signup")}>
                  Sign Up
                  <ArrowRight className="h-4 w-4" />
                </a>
              </Button>
            )}
            <Button asChild size="lg" variant="ghost">
              <a href="#approach">Why we built it this way</a>
            </Button>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
