"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight } from "lucide-react";
import { useUser } from "@clerk/nextjs";
import { useTheme } from "next-themes";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { SplitText } from "gsap/SplitText";

import { Button } from "@/components/ui/button";
import {
  HeroColorPanelsContainer,
  HeroColorPanelsContent,
  HeroColorPanelsDescription,
  HeroColorPanelsHeading,
  HeroColorPanelsMobileVisual,
  HeroColorPanelsRoot,
  HeroColorPanelsVisual,
} from "@/components/ui/hero-color-panel";
import { apiUrl, withBasePath } from "@/lib/basePath";
import { paymentsEnabled } from "@/lib/featureFlags";
import { getSolShaderProps } from "@/lib/heroShaderColors";

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
  const rootRef = useRef<HTMLDivElement>(null);

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

  const shaderProps = useMemo(
    () =>
      getSolShaderProps({
        reducedMotion,
        dark: resolvedTheme === "dark",
      }),
    [reducedMotion, resolvedTheme],
  );

  // Word-by-word SplitText reveal on the hero headline. Gated on prefers-reduced-motion
  // (no animation is created when the user asks for reduced motion — the text stays static
  // and fully visible). useGSAP handles cleanup; autoSplit re-splits on font load / resize.
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
    <div ref={rootRef} className="contents">
      <HeroColorPanelsRoot
        className="bg-paper pt-28 md:pt-32"
        srTitle="SOL. Quiz platform with AI grading for subjective answers."
        showCta={false}
        showBadges={false}
        desktopShaderProps={shaderProps.desktop}
        mobileShaderProps={shaderProps.mobile}
      >
        <HeroColorPanelsContainer className="mx-auto max-w-[1200px] px-4 md:px-8 lg:grid-cols-[1fr_minmax(300px,480px)] xl:grid-cols-[1fr_520px]">
          <HeroColorPanelsContent className="px-0 md:px-0 lg:pl-0">
            <HeroColorPanelsHeading className="pt-0 text-left lg:text-left">
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
            </HeroColorPanelsHeading>

            <HeroColorPanelsDescription
              className="mx-0 max-w-none text-left lg:text-left"
              descriptionClassName="text-ink-muted text-base md:text-lg leading-relaxed max-w-[56ch]"
              description="The quiz is yours. The grading isn't."
            />

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 pt-1">
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
            </div>
          </HeroColorPanelsContent>

          <HeroColorPanelsVisual
            className="h-[320px] lg:h-[420px] xl:h-[500px]"
            desktopClassName="rounded-none"
          />
        </HeroColorPanelsContainer>

        <HeroColorPanelsMobileVisual className="-bottom-16 h-[340px]" />
      </HeroColorPanelsRoot>

      <div className="hairline" />
    </div>
  );
}
