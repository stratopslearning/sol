"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";

const DEFAULT_MILESTONE_SECONDS = [300, 120, 60];

interface QuizTimerProps {
  /** Initial seconds remaining (server-synced on resume). */
  initialSeconds: number;
  onTimeUp: () => void;
  /** When true, the countdown stops (e.g. while submission is in progress). */
  paused?: boolean;
  /** Remaining-time thresholds (seconds) for one-shot toasts, highest first. */
  milestoneSeconds?: number[];
}

function milestoneLabel(seconds: number): string {
  const minutes = Math.round(seconds / 60);
  return minutes === 1 ? "1 minute left" : `${minutes} minutes left`;
}

function notifyMilestone(seconds: number) {
  const message = milestoneLabel(seconds);
  const description = "Time is running out on this quiz.";
  if (seconds <= 120) {
    toast.warning(message, { description });
  } else {
    toast.info(message, { description });
  }
}

/**
 * Wall-clock based quiz countdown.
 *
 * Why wall-clock and not a setInterval decrement?
 *   Browsers throttle setInterval to ~1Hz/minute in background tabs (Chrome
 *   especially). A decrementing counter therefore drifts arbitrarily far
 *   behind real time when the tab is hidden — a 2-minute quiz can show 90
 *   seconds remaining 6 wall-clock minutes after start. The server sees
 *   the true elapsed time and rejects the submit.
 *
 * How this implementation stays honest:
 *   - We compute a stable `deadlineMs` once from `initialSeconds`.
 *   - The display ticks from `Date.now()`, so every render reflects real
 *     time. The interval is purely cosmetic.
 *   - A separate `setTimeout(onTimeUp, msUntilDeadline)` fires at the
 *     actual deadline; browsers honor `setTimeout` schedules far more
 *     reliably than throttled interval ticks.
 *   - `visibilitychange` and window `focus` listeners force-resync the
 *     instant the user returns to the tab, so we catch any throttling slack.
 */
export function QuizTimer({
  initialSeconds,
  onTimeUp,
  paused = false,
  milestoneSeconds = DEFAULT_MILESTONE_SECONDS,
}: QuizTimerProps) {
  // The deadline is captured once per `initialSeconds` change. Stored in
  // state (not a ref) so React rerenders consumers when the parent resyncs.
  const [deadlineMs, setDeadlineMs] = useState(
    () => Date.now() + Math.max(0, initialSeconds) * 1000,
  );
  const [now, setNow] = useState(() => Date.now());
  const onTimeUpRef = useRef(onTimeUp);
  const firedTimeUpRef = useRef(false);
  const firedMilestonesRef = useRef<Set<number>>(new Set());

  // Keep the latest onTimeUp without retriggering deadline effects.
  useEffect(() => {
    onTimeUpRef.current = onTimeUp;
  }, [onTimeUp]);

  // When the parent passes a new initialSeconds (e.g. after server resync
  // on resume), reset the deadline and milestone state.
  useEffect(() => {
    setDeadlineMs(Date.now() + Math.max(0, initialSeconds) * 1000);
    setNow(Date.now());
    firedTimeUpRef.current = false;
    firedMilestonesRef.current.clear();
  }, [initialSeconds]);

  const applicableMilestones = useMemo(() => {
    const sorted = [...milestoneSeconds].sort((a, b) => b - a);
    return sorted.filter((t) => t > 0 && t <= initialSeconds);
  }, [milestoneSeconds, initialSeconds]);

  const timeRemaining = Math.max(0, Math.ceil((deadlineMs - now) / 1000));

  // Cosmetic 1Hz tick to keep the displayed value moving while the tab is
  // visible. setInterval may be throttled in the background, but that's
  // fine — the wall-clock setTimeout + visibility listeners catch up.
  useEffect(() => {
    if (paused) return;
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, [paused]);

  // The authoritative time-up trigger: a setTimeout that fires at the
  // exact wall-clock deadline. Independent of interval throttling.
  useEffect(() => {
    if (paused) return;
    if (firedTimeUpRef.current) return;
    const msUntilDeadline = deadlineMs - Date.now();

    if (msUntilDeadline <= 0) {
      firedTimeUpRef.current = true;
      onTimeUpRef.current();
      return;
    }

    const timeout = setTimeout(() => {
      if (firedTimeUpRef.current) return;
      firedTimeUpRef.current = true;
      setNow(Date.now());
      onTimeUpRef.current();
    }, msUntilDeadline);

    return () => clearTimeout(timeout);
  }, [deadlineMs, paused]);

  // Re-sync immediately when the tab becomes visible or window regains
  // focus. If real time has already passed the deadline while the tab was
  // hidden, fire time-up right now.
  useEffect(() => {
    if (paused) return;
    const resync = () => {
      const current = Date.now();
      setNow(current);
      if (!firedTimeUpRef.current && current >= deadlineMs) {
        firedTimeUpRef.current = true;
        onTimeUpRef.current();
      }
    };
    document.addEventListener("visibilitychange", resync);
    window.addEventListener("focus", resync);
    window.addEventListener("pageshow", resync);
    return () => {
      document.removeEventListener("visibilitychange", resync);
      window.removeEventListener("focus", resync);
      window.removeEventListener("pageshow", resync);
    };
  }, [deadlineMs, paused]);

  // Milestone toasts — fire each one exactly once per deadline reset.
  useEffect(() => {
    if (paused) return;
    for (const threshold of applicableMilestones) {
      if (
        timeRemaining <= threshold &&
        !firedMilestonesRef.current.has(threshold)
      ) {
        firedMilestonesRef.current.add(threshold);
        notifyMilestone(threshold);
      }
    }
  }, [timeRemaining, applicableMilestones, paused]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${secs
        .toString()
        .padStart(2, "0")}`;
    }
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  };

  const isWarning = timeRemaining <= 300;
  const isCritical = timeRemaining <= 60;

  return (
    <span
      className={cn(
        "font-mono tabular-nums text-sm tracking-tight transition-colors",
        isCritical && "text-danger animate-pulse",
        isWarning && !isCritical && "text-warning-fg",
        !isWarning && "text-ink",
      )}
    >
      {formatTime(timeRemaining)}
    </span>
  );
}
