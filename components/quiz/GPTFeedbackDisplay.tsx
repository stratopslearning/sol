import React from "react";
import { Sparkles } from "lucide-react";

interface GPTFeedbackData {
  score: number;
  feedback: string;
}

interface GPTFeedbackDisplayProps {
  feedback: GPTFeedbackData;
  questionText: string;
  studentAnswer: string;
  className?: string;
}

export function GPTFeedbackDisplay({
  feedback,
  className = "",
}: GPTFeedbackDisplayProps) {
  return (
    <section
      className={`border border-info/30 bg-info-soft/40 rounded-md p-5 ${className}`}
    >
      <header className="flex items-center gap-2 eyebrow text-info-fg">
        <Sparkles className="h-3.5 w-3.5" />
        AI feedback
      </header>
      <p className="mt-3 text-sm text-ink leading-relaxed max-w-prose">
        {feedback.feedback}
      </p>
      <div className="mt-4 hairline" />
      <div className="mt-3 flex items-baseline gap-2">
        <span className="eyebrow text-ink-faint">Score</span>
        <span className="font-display text-lg text-ink tnum">
          {feedback.score}
        </span>
      </div>
    </section>
  );
}
