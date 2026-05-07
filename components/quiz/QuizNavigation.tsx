"use client";

import { CheckCircle } from "lucide-react";

import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface QuizNavigationProps {
  questions: any[];
  answers: Record<string, any>;
  currentQuestionIndex: number;
  onQuestionSelect: (index: number) => void;
}

export function QuizNavigation({
  questions,
  answers,
  currentQuestionIndex,
  onQuestionSelect,
}: QuizNavigationProps) {
  const isQuestionAnswered = (questionId: string) => {
    const answer = answers[questionId];
    if (!answer) return false;
    if (typeof answer === "string") return answer.trim().length > 0;
    return true;
  };

  const answeredCount = Object.keys(answers).filter((key) => {
    const answer = answers[key];
    return (
      answer && (typeof answer !== "string" || answer.trim().length > 0)
    );
  }).length;
  const progress = (answeredCount / questions.length) * 100;

  return (
    <aside className="paper paper-shadow p-5 lg:sticky lg:top-6">
      <div className="flex items-baseline justify-between">
        <span className="eyebrow text-ink-faint">Navigator</span>
        <span className="text-xs text-ink-faint tnum">
          {answeredCount}/{questions.length}
        </span>
      </div>

      <div className="mt-3">
        <Progress value={progress} className="h-1" />
      </div>

      <div className="mt-5 grid grid-cols-5 gap-2">
        {questions.map((question, index) => {
          const isAnswered = isQuestionAnswered(question.id);
          const isCurrent = index === currentQuestionIndex;

          return (
            <button
              key={question.id}
              type="button"
              onClick={() => onQuestionSelect(index)}
              aria-label={`Go to question ${index + 1}${
                isAnswered ? " (answered)" : ""
              }`}
              aria-current={isCurrent ? "step" : undefined}
              className={cn(
                "relative h-9 rounded-md border text-xs tnum font-medium",
                "transition-colors flex items-center justify-center",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50",
                isCurrent &&
                  "bg-brand text-paper border-brand shadow-[0_0_0_2px_var(--brand-soft)]",
                !isCurrent &&
                  isAnswered &&
                  "bg-success/15 text-success-fg border-success/30 hover:bg-success/20",
                !isCurrent &&
                  !isAnswered &&
                  "bg-surface text-ink-muted border-rule hover:border-rule-strong hover:bg-surface-sunken",
              )}
            >
              {isAnswered && !isCurrent ? (
                <CheckCircle className="h-3.5 w-3.5" />
              ) : (
                <span>{index + 1}</span>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-6 hairline" />

      <ul className="mt-4 flex flex-col gap-2 text-xs text-ink-muted">
        <li className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-brand" />
          Current
        </li>
        <li className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-success/40 border border-success/40" />
          Answered
        </li>
        <li className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full border border-rule-strong" />
          Unanswered
        </li>
      </ul>
    </aside>
  );
}
