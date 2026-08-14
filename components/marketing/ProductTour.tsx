"use client";

import { useId, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  MessageSquareText,
  Sparkles,
  Users,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

import {
  AttentionScene,
  FeedbackScene,
  GradebookScene,
  ScoreScene,
  StudentGradesScene,
  StudentPendingScene,
} from "./ProductTourScenes";

type SceneId = "score" | "attention" | "gradebook";

const FEATURES: {
  id: SceneId;
  icon: typeof Sparkles;
  label: string;
  faculty: string;
  student: string;
}[] = [
  {
    id: "score",
    icon: MessageSquareText,
    label: "Short answers, scored with reasoning",
    faculty: "Attempt · Maya Chen",
    student: "Midterm · Feedback",
  },
  {
    id: "attention",
    icon: AlertTriangle,
    label: "Work that still needs a person",
    faculty: "Attention queue",
    student: "Midterm · Waiting",
  },
  {
    id: "gradebook",
    icon: Users,
    label: "Progress both desks can see",
    faculty: "PHIL 210 · Section 03",
    student: "Your grades",
  },
];

const FACULTY_AVATAR = {
  name: "Helen Okoye",
  initials: "HO",
  src: "https://api.dicebear.com/9.x/lorelei/svg?seed=HelenOkoye&backgroundColor=d4e5d8",
};

const STUDENT_AVATAR = {
  name: "Maya Chen",
  initials: "MC",
  src: "https://api.dicebear.com/9.x/lorelei/svg?seed=MayaChen&backgroundColor=d4e5d8",
};

function TourFrame({
  role,
  title,
  labelledBy,
  id,
  avatar,
  children,
}: {
  role: "Faculty" | "Learner";
  title: string;
  labelledBy: string;
  id: string;
  avatar: { name: string; initials: string; src: string };
  children: ReactNode;
}) {
  return (
    <div
      id={id}
      role="tabpanel"
      aria-labelledby={labelledBy}
      className="relative flex min-h-[22rem] flex-col overflow-hidden rounded-lg border border-rule bg-paper paper-shadow-lg md:min-h-[26rem]"
    >
      <div className="flex h-10 items-center gap-3 border-b border-rule px-3 md:px-4">
        <span className="flex min-w-0 items-baseline gap-2">
          <span
            className="font-display text-sm tracking-tight text-ink"
            style={{ fontVariationSettings: '"opsz" 36, "SOFT" 30' }}
          >
            SOL
          </span>
          <span className="eyebrow text-ink-faint">{role}</span>
        </span>
        <span className="min-w-0 flex-1 truncate text-right text-[11px] text-ink-muted">
          {title}
        </span>
        <Avatar className="h-6 w-6 border border-rule" aria-label={avatar.name}>
          <AvatarImage src={avatar.src} alt={avatar.name} />
          <AvatarFallback className="bg-brand-soft text-[9px] font-semibold text-brand">
            {avatar.initials}
          </AvatarFallback>
        </Avatar>
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-4">{children}</div>
    </div>
  );
}

export function ProductTour() {
  const [active, setActive] = useState<SceneId>("score");
  const [overridden, setOverridden] = useState(false);
  const reduce = useReducedMotion();
  const tablistId = useId();
  const feature = FEATURES.find((item) => item.id === active) ?? FEATURES[0];

  return (
    <section
      id="product"
      className="border-t border-rule bg-[color-mix(in_oklch,var(--surface-sunken)_78%,transparent)]"
    >
      <div className="mx-auto max-w-[1200px] px-4 py-20 md:px-8 md:py-28">
        <div className="grid gap-10 md:grid-cols-12 md:gap-12">
          <div className="md:col-span-5">
            <span className="eyebrow">Inside SOL</span>
            <h2
              className="mt-3 font-display text-ink"
              style={{
                fontSize: "clamp(2rem, 4vw, 3rem)",
                lineHeight: 1.05,
                fontVariationSettings: '"opsz" 96, "SOFT" 30',
              }}
            >
              Both sides of
              <br />
              <em
                className="text-brand"
                style={{ fontVariationSettings: '"opsz" 96, "WONK" 1' }}
              >
                the same desk.
              </em>
            </h2>
          </div>
          <p className="md:col-span-7 md:pt-8 max-w-[48ch] text-base leading-relaxed text-ink-muted md:text-lg">
            Faculty on the left, the learner on the right. One moment, two
            views — scoring, the queue, and the record.
          </p>
        </div>

        <div
          role="tablist"
          aria-label="Product surfaces"
          className="mt-10 flex flex-col gap-1 sm:flex-row sm:flex-wrap sm:gap-2"
        >
          {FEATURES.map((item) => {
            const Icon = item.icon;
            const selected = active === item.id;
            const tabId = `${tablistId}-${item.id}`;
            return (
              <button
                key={item.id}
                id={tabId}
                type="button"
                role="tab"
                aria-selected={selected}
                aria-controls={`${tablistId}-faculty ${tablistId}-student`}
                tabIndex={selected ? 0 : -1}
                onClick={() => setActive(item.id)}
                onKeyDown={(event) => {
                  if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") {
                    return;
                  }
                  event.preventDefault();
                  const i = FEATURES.findIndex((f) => f.id === item.id);
                  const next =
                    event.key === "ArrowRight"
                      ? FEATURES[(i + 1) % FEATURES.length]
                      : FEATURES[(i - 1 + FEATURES.length) % FEATURES.length];
                  setActive(next.id);
                  document.getElementById(`${tablistId}-${next.id}`)?.focus();
                }}
                className={cn(
                  "relative flex items-center gap-3 rounded-md px-3 py-3 text-left transition-colors sm:flex-1",
                  selected ? "text-ink" : "text-ink-muted hover:text-ink",
                )}
              >
                {selected ? (
                  <motion.span
                    layoutId="product-tour-mark"
                    className="absolute inset-x-3 bottom-1 h-px bg-brand"
                    initial={false}
                    transition={{ type: "spring", stiffness: 480, damping: 36 }}
                  />
                ) : null}
                <span
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-md border",
                    selected
                      ? "border-brand/35 bg-brand-soft text-brand"
                      : "border-rule bg-surface text-ink-faint",
                  )}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <span className="text-sm font-medium leading-snug">
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>

        <div className="relative mt-10">
          <div
            aria-hidden
            className="pointer-events-none absolute -inset-8 bg-[radial-gradient(50%_80%_at_50%_40%,color-mix(in_oklch,var(--brand)_18%,transparent),transparent)] blur-2xl"
          />
          <div className="relative grid gap-5 lg:grid-cols-2">
            <TourFrame
              id={`${tablistId}-faculty`}
              role="Faculty"
              title={feature.faculty}
              labelledBy={`${tablistId}-${active}`}
              avatar={FACULTY_AVATAR}
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={`faculty-${active}`}
                  initial={reduce ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduce ? undefined : { opacity: 0, y: -6 }}
                  transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                >
                  {active === "score" ? (
                    <ScoreScene
                      overridden={overridden}
                      onOverride={() => setOverridden(true)}
                    />
                  ) : active === "attention" ? (
                    <AttentionScene />
                  ) : (
                    <GradebookScene />
                  )}
                </motion.div>
              </AnimatePresence>
            </TourFrame>

            <TourFrame
              id={`${tablistId}-student`}
              role="Learner"
              title={feature.student}
              labelledBy={`${tablistId}-${active}`}
              avatar={STUDENT_AVATAR}
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={`student-${active}`}
                  initial={reduce ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduce ? undefined : { opacity: 0, y: -6 }}
                  transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                >
                  {active === "score" ? (
                    <FeedbackScene overridden={overridden} />
                  ) : active === "attention" ? (
                    <StudentPendingScene />
                  ) : (
                    <StudentGradesScene overridden={overridden} />
                  )}
                </motion.div>
              </AnimatePresence>
            </TourFrame>
          </div>
        </div>
      </div>
    </section>
  );
}
