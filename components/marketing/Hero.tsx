"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { useUser } from "@clerk/nextjs";

import { Button } from "@/components/ui/button";
import { apiUrl, withBasePath } from "@/lib/basePath";
import { paymentsEnabled } from "@/lib/featureFlags";

interface DbUser {
  role?: "STUDENT" | "PROFESSOR" | "ADMIN";
  paid?: boolean;
}

const HEADLINE_ONE = "Learning,";
const HEADLINE_TWO = "considered.";

export function Hero() {
  const { isSignedIn } = useUser();
  const [dbUser, setDbUser] = useState<DbUser | null>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (!isSignedIn) return;
    fetch(apiUrl("/api/user"))
      .then((res) => res.json())
      .then((data) => setDbUser(data.user))
      .catch((err) => console.error("Error fetching user:", err));
  }, [isSignedIn]);

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

  const easing = [0.22, 0.61, 0.36, 1] as const;
  const baseDelay = reduced ? 0 : 0.18;
  const stepDelay = reduced ? 0 : 0.12;

  return (
    <section className="relative overflow-hidden bg-paper paper-grain">
      <div className="absolute inset-x-0 top-0 h-px bg-rule" aria-hidden />
      <BackdropMarks />

      <div className="relative mx-auto max-w-[1200px] px-4 md:px-8 pt-32 pb-20 md:pt-40 md:pb-28">
        <div className="grid md:grid-cols-12 gap-10 items-end">
          <motion.div
            initial={reduced ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: baseDelay, ease: easing }}
            className="md:col-span-7 flex flex-col gap-6"
          >
            <span className="eyebrow inline-flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-brand" aria-hidden />
              An academic learning platform
            </span>

            <h1
              className="font-display text-ink"
              style={{
                fontSize: "clamp(2.75rem, 7vw, 5.5rem)",
                lineHeight: 0.95,
                letterSpacing: "-0.035em",
                fontVariationSettings: '"opsz" 144, "SOFT" 40',
              }}
            >
              <motion.span
                initial={reduced ? false : { opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.7,
                  delay: baseDelay + stepDelay,
                  ease: easing,
                }}
                className="block"
              >
                {HEADLINE_ONE}
              </motion.span>
              <motion.span
                initial={reduced ? false : { opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.7,
                  delay: baseDelay + stepDelay * 2,
                  ease: easing,
                }}
                className="block italic text-brand"
                style={{ fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1' }}
              >
                {HEADLINE_TWO}
              </motion.span>
            </h1>

            <motion.p
              initial={reduced ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.5,
                delay: baseDelay + stepDelay * 3,
                ease: easing,
              }}
              className="max-w-[58ch] text-base md:text-lg leading-relaxed text-ink-muted"
            >
              SOL turns any open textbook into a structured course — auto-graded
              quizzes, AI-assisted feedback, and a quiet, considered interface
              for faculty and learners alike. Used by universities that take
              pedagogy seriously.
            </motion.p>

            <motion.div
              initial={reduced ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.5,
                delay: baseDelay + stepDelay * 4,
                ease: easing,
              }}
              className="flex flex-col sm:flex-row items-start sm:items-center gap-3 pt-2"
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
                    Request access
                    <ArrowRight className="h-4 w-4" />
                  </a>
                </Button>
              )}
              <Button asChild size="lg" variant="ghost">
                <a href="#approach">Read the approach</a>
              </Button>
            </motion.div>

            <motion.div
              initial={reduced ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{
                duration: 0.6,
                delay: baseDelay + stepDelay * 5,
                ease: easing,
              }}
              className="flex items-center gap-6 pt-6"
            >
              {/* <span className="eyebrow text-ink-faint">Trusted at</span> */}
              {/* <div className="flex items-center gap-5 text-ink-faint font-display text-sm">
                <span style={{ fontVariationSettings: '"opsz" 24' }}>Mercer</span>
                <span aria-hidden className="h-3 w-px bg-rule" />
                <span style={{ fontVariationSettings: '"opsz" 24' }}>Linfield</span>
                <span aria-hidden className="h-3 w-px bg-rule" />
                <span style={{ fontVariationSettings: '"opsz" 24' }}>
                  Catawba
                </span>
                <span aria-hidden className="hidden sm:inline h-3 w-px bg-rule" />
                <span
                  className="hidden sm:inline"
                  style={{ fontVariationSettings: '"opsz" 24' }}
                >
                  Wesleyan
                </span>
              </div> */}
            </motion.div>
          </motion.div>

          <motion.div
            initial={reduced ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.7,
              delay: baseDelay + stepDelay * 2,
              ease: easing,
            }}
            className="md:col-span-5 hidden md:block"
          >
            <SpecimenCard />
          </motion.div>
        </div>
      </div>

      <div className="hairline" />
    </section>
  );
}

/* ---------- Side specimen "card" — editorial, not glass ---------- */
function SpecimenCard() {
  return (
    <figure className="paper paper-shadow-lg flex flex-col">
      <div className="px-6 pt-5 pb-3 flex items-center justify-between">
        <span className="eyebrow">Volume 04 · Quiz 12</span>
        <span className="text-xs font-mono tnum text-ink-faint">02:14:30</span>
      </div>
      <div className="hairline" />
      <div className="px-6 py-7 flex flex-col gap-5">
        <span className="eyebrow text-brand">Question 03 of 18</span>
        <p
          className="font-display text-ink"
          style={{
            fontSize: "1.5rem",
            lineHeight: 1.2,
            fontVariationSettings: '"opsz" 36',
          }}
        >
          The principle of least action is best characterised as a
          <em> variational </em> principle because…
        </p>
        <ul className="flex flex-col gap-2 text-sm">
          <ChoiceRow letter="A" label="It minimises kinetic energy alone." />
          <ChoiceRow
            letter="B"
            label="It extremises a functional over all admissible paths."
            selected
          />
          <ChoiceRow letter="C" label="It conserves total mechanical energy." />
          <ChoiceRow letter="D" label="It applies only to closed systems." />
        </ul>
      </div>
      <div className="hairline" />
      <figcaption className="px-6 py-4 flex items-center justify-between text-xs text-ink-muted">
        <span className="font-mono tnum">PHYS-201 · §4.2</span>
        <span>3 / 18 answered</span>
      </figcaption>
    </figure>
  );
}

function ChoiceRow({
  letter,
  label,
  selected,
}: {
  letter: string;
  label: string;
  selected?: boolean;
}) {
  return (
    <li
      className={`flex items-start gap-3 rounded-md border px-3 py-2.5 transition-colors ${
        selected
          ? "border-brand bg-brand-soft text-ink"
          : "border-rule text-ink-muted"
      }`}
    >
      <span
        className={`mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full border text-[0.6875rem] font-semibold ${
          selected
            ? "border-brand bg-brand text-brand-foreground"
            : "border-rule text-ink-faint"
        }`}
      >
        {letter}
      </span>
      <span className="text-sm leading-snug">{label}</span>
    </li>
  );
}

/* ---------- Background marks — restrained, decorative, no blobs ---------- */
function BackdropMarks() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      <div
        className="absolute -top-24 -right-24 h-[28rem] w-[28rem] rounded-full opacity-[0.05]"
        style={{
          background:
            "radial-gradient(closest-side, var(--brand) 0%, transparent 70%)",
        }}
      />
      <div
        className="absolute top-[42%] -left-32 h-[20rem] w-[20rem] rounded-full opacity-[0.04]"
        style={{
          background:
            "radial-gradient(closest-side, var(--accent) 0%, transparent 70%)",
        }}
      />
    </div>
  );
}
