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

export function QuizTimer({
  initialSeconds,
  onTimeUp,
  paused = false,
  milestoneSeconds = DEFAULT_MILESTONE_SECONDS,
}: QuizTimerProps) {
  const [timeRemaining, setTimeRemaining] = useState(initialSeconds);
  const firedMilestonesRef = useRef<Set<number>>(new Set());

  const applicableMilestones = useMemo(() => {
    const sorted = [...milestoneSeconds].sort((a, b) => b - a);
    return sorted.filter((t) => t > 0 && t <= initialSeconds);
  }, [milestoneSeconds, initialSeconds]);

  useEffect(() => {
    setTimeRemaining(initialSeconds);
    firedMilestonesRef.current.clear();
  }, [initialSeconds]);

  useEffect(() => {
    if (paused) return;
    if (timeRemaining <= 0) {
      onTimeUp();
      return;
    }

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        const next = prev <= 1 ? 0 : prev - 1;

        if (!paused) {
          for (const threshold of applicableMilestones) {
            if (
              prev > threshold &&
              next <= threshold &&
              !firedMilestonesRef.current.has(threshold)
            ) {
              firedMilestonesRef.current.add(threshold);
              notifyMilestone(threshold);
            }
          }
        }

        if (prev <= 1) {
          onTimeUp();
          return 0;
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeRemaining, onTimeUp, paused, applicableMilestones]);

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
