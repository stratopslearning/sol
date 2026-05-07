"use client";

import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

interface QuizTimerProps {
  timeLimit: number;
  onTimeUp: () => void;
  /** When true, the countdown stops (e.g. while submission is in progress). */
  paused?: boolean;
}

export function QuizTimer({
  timeLimit,
  onTimeUp,
  paused = false,
}: QuizTimerProps) {
  const [timeRemaining, setTimeRemaining] = useState(timeLimit);

  useEffect(() => {
    if (paused) return;
    if (timeRemaining <= 0) {
      onTimeUp();
      return;
    }

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          onTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeRemaining, onTimeUp, paused]);

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
