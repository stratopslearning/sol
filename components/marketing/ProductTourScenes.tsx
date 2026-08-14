"use client";

import { useState } from "react";
import {
  AlertTriangle,
  Check,
  CircleDashed,
  X,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

function Face({
  name,
  initials,
  className,
}: {
  name: string;
  initials: string;
  className?: string;
}) {
  return (
    <Avatar className={cn("h-6 w-6 border border-rule", className)}>
      <AvatarImage
        src={`https://api.dicebear.com/9.x/lorelei/svg?seed=${encodeURIComponent(name)}&backgroundColor=d4e5d8`}
        alt={name}
      />
      <AvatarFallback className="bg-brand-soft text-[9px] font-semibold text-brand">
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}

export function ScoreScene({
  overridden = false,
  onOverride,
}: {
  overridden?: boolean;
  onOverride?: () => void;
}) {
  const score = overridden ? 8 : 7;

  return (
    <div className="flex flex-col gap-3.5">
      <header className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2.5">
          <Face name="Maya Chen" initials="MC" className="mt-1 h-8 w-8" />
          <div className="min-w-0">
            <span className="eyebrow text-ink-faint">Attempt</span>
            <h3
              className="mt-1 font-display text-ink"
              style={{
                fontSize: "1.15rem",
                lineHeight: 1.2,
                fontVariationSettings: '"opsz" 36',
              }}
            >
              Maya Chen
            </h3>
            <p className="mt-0.5 text-xs text-ink-muted">
              PHIL 210 · §03 · Midterm
            </p>
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <div className="flex items-baseline gap-1.5">
            <span
              className="font-display tnum text-brand"
              style={{
                fontSize: "1.6rem",
                lineHeight: 1,
                fontVariationSettings: '"opsz" 48',
              }}
            >
              {score}
            </span>
            <span className="text-sm text-ink-faint tnum">/ 10</span>
          </div>
          {overridden ? (
            <Badge variant="accent">Adjusted</Badge>
          ) : (
            <button
              type="button"
              onClick={onOverride}
              className="rounded-md border border-rule bg-surface px-2.5 py-1 text-[11px] font-medium text-ink hover:border-rule-strong hover:bg-surface-sunken"
            >
              Override
            </button>
          )}
        </div>
      </header>

      <p className="text-[13px] leading-relaxed text-ink">
        Why does Kant treat persons as ends in themselves, rather than as
        means?
      </p>

      <div className="rounded-md border border-rule bg-surface-sunken/50 px-3 py-2.5">
        <span className="eyebrow text-ink-faint">Student answer</span>
        <p className="mt-1.5 text-[12px] leading-relaxed text-ink-muted">
          Because using someone only as a tool ignores that they can set their
          own ends. The humanity formulation says we have to treat rational
          agents as sources of value, not instruments for ours.
        </p>
      </div>

      <div>
        <span className="eyebrow text-ink-faint">Rubric</span>
        <ul className="mt-2 flex flex-col gap-1.5">
          <RubricRow state="met" text="Names the humanity formulation" />
          <RubricRow
            state="partial"
            text="Distinguishes from hypothetical imperatives"
          />
          <RubricRow state="missed" text="Applies the claim to a concrete case" />
        </ul>
      </div>

      <div className="rounded-md border border-brand/25 bg-brand-soft/40 px-3 py-2.5">
        <span className="eyebrow text-brand">Reasoning</span>
        <p className="mt-1.5 text-[12px] leading-relaxed text-ink-muted">
          Dignity is located correctly. The contrast with a hypothetical
          imperative, and a concrete case, are still open.
        </p>
      </div>
    </div>
  );
}

function RubricRow({
  state,
  text,
}: {
  state: "met" | "partial" | "missed";
  text: string;
}) {
  const icon =
    state === "met" ? (
      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" />
    ) : state === "partial" ? (
      <CircleDashed className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" />
    ) : (
      <X className="mt-0.5 h-3.5 w-3.5 shrink-0 text-danger" />
    );

  return (
    <li className="flex items-start gap-2 text-[12px] leading-snug text-ink">
      {icon}
      <span>{text}</span>
    </li>
  );
}

const ATTENTION = [
  {
    name: "Maya Chen",
    initials: "MC",
    quiz: "Midterm",
    detail: "1 needs review · PHIL 210 §03",
    tone: "review" as const,
  },
  {
    name: "Jordan Hale",
    initials: "JH",
    quiz: "Response paper 2",
    detail: "2 pending · PHIL 210 §03",
    tone: "pending" as const,
  },
  {
    name: "Priya Nair",
    initials: "PN",
    quiz: "Midterm",
    detail: "Low confidence · PHIL 210 §03",
    tone: "review" as const,
  },
  {
    name: "Eli Park",
    initials: "EP",
    quiz: "Week 5 quiz",
    detail: "Legacy fallback · PHIL 210 §01",
    tone: "pending" as const,
  },
];

export function AttentionScene() {
  const [selected, setSelected] = useState(0);

  return (
    <div className="flex flex-col gap-4">
      <header>
        <span className="eyebrow text-ink-faint">Grading</span>
        <h3
          className="mt-1 font-display text-ink"
          style={{
            fontSize: "1.25rem",
            lineHeight: 1.2,
            fontVariationSettings: '"opsz" 36',
          }}
        >
          Needs a human eye
        </h3>
        <p className="mt-1 text-xs text-ink-muted">
          First-pass is done. These are the responses still worth your time.
        </p>
      </header>

      <div className="grid grid-cols-3 gap-2">
        <MiniStat label="Queue" value="4" />
        <MiniStat label="Review" value="2" />
        <MiniStat label="Pending" value="2" />
      </div>

      <ul className="overflow-hidden rounded-md border border-rule bg-surface">
        {ATTENTION.map((item, index) => {
          const active = selected === index;
          return (
            <li key={item.name}>
              <button
                type="button"
                onClick={() => setSelected(index)}
                className={cn(
                  "flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors",
                  index !== 0 && "border-t border-rule",
                  active
                    ? "bg-brand-soft/50"
                    : "hover:bg-surface-sunken/70",
                )}
              >
                <AlertTriangle
                  className={cn(
                    "h-3.5 w-3.5 shrink-0",
                    item.tone === "review" ? "text-warning" : "text-ink-faint",
                  )}
                />
                <Face name={item.name} initials={item.initials} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-1.5">
                    <span className="truncate text-[13px] font-medium text-ink">
                      {item.name}
                    </span>
                    <span className="truncate text-[11px] text-ink-faint">
                      · {item.quiz}
                    </span>
                  </div>
                  <p className="truncate text-[11px] text-ink-muted">
                    {item.detail}
                  </p>
                </div>
                <span className="shrink-0 text-[11px] font-medium text-brand">
                  {active ? "Open" : "View"}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-rule bg-surface px-2.5 py-2">
      <span className="eyebrow text-ink-faint">{label}</span>
      <div
        className="mt-1 font-display tnum text-ink"
        style={{ fontSize: "1.25rem", fontVariationSettings: '"opsz" 36' }}
      >
        {value}
      </div>
    </div>
  );
}

const LEARNERS = [
  { name: "Chen, Maya", q1: 92, q2: 88, mid: 70, avg: 83 },
  { name: "Hale, Jordan", q1: 78, q2: 81, mid: 74, avg: 78 },
  { name: "Nair, Priya", q1: 95, q2: 91, mid: 86, avg: 91 },
  { name: "Park, Eli", q1: 84, q2: "—", mid: 68, avg: 76 },
  { name: "Rossi, Ana", q1: 88, q2: 90, mid: 82, avg: 87 },
];

export function GradebookScene() {
  const [selected, setSelected] = useState(0);

  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-start justify-between gap-3">
        <div>
          <span className="eyebrow text-ink-faint">Section 03</span>
          <h3
            className="mt-1 font-display text-ink"
            style={{
              fontSize: "1.25rem",
              lineHeight: 1.2,
              fontVariationSettings: '"opsz" 36',
            }}
          >
            Gradebook
          </h3>
          <p className="mt-1 text-xs text-ink-muted">
            PHIL 210 · Ethics · 28 enrolled
          </p>
        </div>
        <Badge variant="secondary">Export CSV</Badge>
      </header>

      <div className="overflow-hidden rounded-md border border-rule">
        <table className="w-full border-collapse text-left text-[11px]">
          <thead className="bg-surface-sunken/60">
            <tr className="border-b border-rule text-ink-faint">
              <th className="px-3 py-2 font-medium">Learner</th>
              <th className="px-2 py-2 font-medium tnum">Q1</th>
              <th className="px-2 py-2 font-medium tnum">Q2</th>
              <th className="px-2 py-2 font-medium tnum">Mid</th>
              <th className="px-3 py-2 font-medium tnum">Avg</th>
            </tr>
          </thead>
          <tbody>
            {LEARNERS.map((row, index) => {
              const active = selected === index;
              return (
                <tr
                  key={row.name}
                  onClick={() => setSelected(index)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setSelected(index);
                    }
                  }}
                  tabIndex={0}
                  className={cn(
                    "cursor-pointer border-b border-rule last:border-b-0",
                    active ? "bg-brand-soft/50" : "hover:bg-surface-sunken/50",
                  )}
                >
                  <td className="px-3 py-2 font-medium text-ink">{row.name}</td>
                  <td className="px-2 py-2 tnum text-ink-muted">{row.q1}</td>
                  <td className="px-2 py-2 tnum text-ink-muted">{row.q2}</td>
                  <td className="px-2 py-2 tnum text-ink-muted">{row.mid}</td>
                  <td className="px-3 py-2 tnum font-medium text-ink">{row.avg}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const QUESTIONS = [
  {
    label: "Q1",
    prompt: "The humanity formulation is a version of the…",
    answer: "Categorical imperative",
    score: "2 / 2",
    note: "Correct. Multiple choice, scored on submit.",
  },
  {
    label: "Q2",
    prompt: "Why treat persons as ends, not means?",
    answer:
      "Because they can set their own ends — using them only as tools ignores that.",
    score: "7 / 10",
    note: "Dignity is located correctly. Example and contrast with hypothetical imperatives still open.",
  },
];

export function FeedbackScene({ overridden = false }: { overridden?: boolean }) {
  const [index, setIndex] = useState(1);
  const question = QUESTIONS[index];
  const score = index === 1 ? (overridden ? "8 / 10" : "7 / 10") : question.score;
  const note =
    index === 1 && overridden
      ? "Your instructor adjusted the short-answer score. The example is still worth another look."
      : question.note;

  return (
    <div className="flex flex-col gap-3.5">
      <header>
        <span className="eyebrow text-ink-faint">Your attempt</span>
        <h3
          className="mt-1 font-display text-ink"
          style={{
            fontSize: "1.15rem",
            lineHeight: 1.2,
            fontVariationSettings: '"opsz" 36',
          }}
        >
          Midterm · Feedback
        </h3>
        <p className="mt-1 text-xs text-ink-muted">PHIL 210 · still warm</p>
      </header>

      <div className="flex gap-1.5">
        {QUESTIONS.map((item, i) => (
          <button
            key={item.label}
            type="button"
            onClick={() => setIndex(i)}
            className={cn(
              "rounded-md border px-2.5 py-1 text-[11px] font-medium transition-colors",
              i === index
                ? "border-brand/40 bg-brand-soft text-brand"
                : "border-rule bg-surface text-ink-muted hover:text-ink",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      <p className="text-[13px] leading-relaxed text-ink">{question.prompt}</p>

      <div className="rounded-md border border-rule bg-surface-sunken/50 px-3 py-2.5">
        <span className="eyebrow text-ink-faint">Your answer</span>
        <p className="mt-1.5 text-[12px] leading-relaxed text-ink-muted">
          {question.answer}
        </p>
      </div>

      <div className="flex items-baseline justify-between gap-3 rounded-md border border-brand/25 bg-brand-soft/40 px-3 py-2.5">
        <div>
          <span className="eyebrow text-brand">How it was read</span>
          <p className="mt-1.5 text-[12px] leading-relaxed text-ink-muted">
            {note}
          </p>
        </div>
        <span
          className="shrink-0 font-display tnum text-brand"
          style={{ fontSize: "1.2rem", fontVariationSettings: '"opsz" 36' }}
        >
          {score}
        </span>
      </div>
      {overridden && index === 1 ? (
        <Badge variant="accent" className="self-start">
          Instructor adjusted
        </Badge>
      ) : null}
    </div>
  );
}

export function StudentPendingScene() {
  return (
    <div className="flex flex-col gap-3.5">
      <header>
        <span className="eyebrow text-ink-faint">Your attempt</span>
        <h3
          className="mt-1 font-display text-ink"
          style={{
            fontSize: "1.15rem",
            lineHeight: 1.2,
            fontVariationSettings: '"opsz" 36',
          }}
        >
          Midterm
        </h3>
        <p className="mt-1 text-xs text-ink-muted">Submitted 2 hours ago</p>
      </header>

      <div className="rounded-md border border-warning/30 bg-warning-soft/40 px-3 py-3">
        <span className="eyebrow text-[oklch(0.45_0.14_75)] dark:text-warning">
          Grading in progress
        </span>
        <p className="mt-1.5 text-[12px] leading-relaxed text-ink-muted">
          Your short answer is in the attention queue. The score is not final
          until a person has looked.
        </p>
        <div className="mt-3 flex items-baseline gap-1.5">
          <span className="eyebrow text-ink-faint">Score</span>
          <span className="font-display tnum text-lg text-ink-faint">— / 10</span>
        </div>
      </div>

      <div className="rounded-md border border-rule bg-surface-sunken/50 px-3 py-2.5">
        <span className="eyebrow text-ink-faint">Your answer</span>
        <p className="mt-1.5 text-[12px] leading-relaxed text-ink-muted">
          Because using someone only as a tool ignores that they can set their
          own ends.
        </p>
      </div>
    </div>
  );
}

const MY_GRADES = [
  { quiz: "Week 5 quiz", score: "8 / 10", pct: "80%" },
  { quiz: "Response paper 2", score: "14 / 16", pct: "88%" },
  { quiz: "Midterm", score: "7 / 10", pct: "70%", open: true },
];

export function StudentGradesScene({
  overridden = false,
}: {
  overridden?: boolean;
}) {
  const [selected, setSelected] = useState(2);

  return (
    <div className="flex flex-col gap-3.5">
      <header>
        <span className="eyebrow text-ink-faint">Record</span>
        <h3
          className="mt-1 font-display text-ink"
          style={{
            fontSize: "1.15rem",
            lineHeight: 1.2,
            fontVariationSettings: '"opsz" 36',
          }}
        >
          Your grades
        </h3>
        <p className="mt-1 text-xs text-ink-muted">PHIL 210 · Section 03</p>
      </header>

      <ul className="overflow-hidden rounded-md border border-rule bg-surface">
        {MY_GRADES.map((row, index) => {
          const active = selected === index;
          const score =
            row.open && overridden ? "8 / 10" : row.score;
          const pct = row.open && overridden ? "80%" : row.pct;
          return (
            <li key={row.quiz}>
              <button
                type="button"
                onClick={() => setSelected(index)}
                className={cn(
                  "flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left",
                  index !== 0 && "border-t border-rule",
                  active ? "bg-brand-soft/50" : "hover:bg-surface-sunken/70",
                )}
              >
                <span className="text-[13px] font-medium text-ink">{row.quiz}</span>
                <span className="flex items-baseline gap-2">
                  <span className="text-[11px] text-ink-muted tnum">{score}</span>
                  <span className="font-display tnum text-sm text-ink">{pct}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

