"use client";

import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";

interface QuestionCardProps {
  question: any;
  questionNumber: number;
  answer: any;
  onAnswerChange: (answer: any) => void;
}

export function QuestionCard({
  question,
  questionNumber,
  answer,
  onAnswerChange,
}: QuestionCardProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (
      e.ctrlKey &&
      (e.key === "c" || e.key === "v" || e.key === "x" || e.key === "a")
    ) {
      e.preventDefault();
    }
    if (e.key === "F10" || (e.shiftKey && e.key === "F10")) {
      e.preventDefault();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
  };

  const getQuestionTypeLabel = (type: string) => {
    switch (type) {
      case "MULTIPLE_CHOICE":
        return "Multiple choice";
      case "TRUE_FALSE":
        return "True / false";
      case "SHORT_ANSWER":
        return "Short answer";
      default:
        return type;
    }
  };

  const renderQuestionContent = () => {
    switch (question.type) {
      case "MULTIPLE_CHOICE":
        return (
          <RadioGroup
            value={answer || ""}
            onValueChange={onAnswerChange}
            className="flex flex-col gap-2"
            onKeyDown={handleKeyDown}
            onContextMenu={handleContextMenu}
          >
            {question.options?.map((option: string, index: number) => {
              const id = `option-${index}`;
              const isSelected = answer === option;
              return (
                <Label
                  key={index}
                  htmlFor={id}
                  className={`flex items-start gap-3 px-4 py-3 rounded-md border cursor-pointer transition-colors ${
                    isSelected
                      ? "border-brand bg-brand-soft/40"
                      : "border-rule hover:border-rule-strong hover:bg-surface-sunken/40"
                  }`}
                >
                  <RadioGroupItem value={option} id={id} className="mt-0.5" />
                  <span className="text-ink leading-snug">{option}</span>
                </Label>
              );
            })}
          </RadioGroup>
        );

      case "TRUE_FALSE":
        return (
          <RadioGroup
            value={answer || ""}
            onValueChange={onAnswerChange}
            className="flex flex-col gap-2"
            onKeyDown={handleKeyDown}
            onContextMenu={handleContextMenu}
          >
            {["true", "false"].map((value) => {
              const isSelected = answer === value;
              return (
                <Label
                  key={value}
                  htmlFor={value}
                  className={`flex items-center gap-3 px-4 py-3 rounded-md border cursor-pointer capitalize transition-colors ${
                    isSelected
                      ? "border-brand bg-brand-soft/40"
                      : "border-rule hover:border-rule-strong hover:bg-surface-sunken/40"
                  }`}
                >
                  <RadioGroupItem value={value} id={value} />
                  <span className="text-ink">{value}</span>
                </Label>
              );
            })}
          </RadioGroup>
        );

      case "SHORT_ANSWER":
        return (
          <div className="flex flex-col gap-3">
            <Textarea
              placeholder="Compose your answer…"
              value={answer || ""}
              onChange={(e) => onAnswerChange(e.target.value)}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              onContextMenu={handleContextMenu}
              className="min-h-[160px] resize-y"
              rows={4}
            />
            <p className="text-xs text-ink-faint">
              Your response is graded with AI assistance — you'll receive
              detailed feedback alongside your score.
            </p>
          </div>
        );

      default:
        return (
          <p className="text-danger text-sm">Unsupported question type.</p>
        );
    }
  };

  return (
    <article className="paper paper-shadow p-6 md:p-8">
      <header className="flex items-center gap-2 flex-wrap">
        <span className="eyebrow text-ink-faint">
          Question {questionNumber}
        </span>
        <span className="text-ink-faint">·</span>
        <Badge variant="outline">{getQuestionTypeLabel(question.type)}</Badge>
        {question.points > 1 ? (
          <Badge variant="info" className="tnum">
            {question.points} points
          </Badge>
        ) : null}
      </header>

      <h2 className="font-display text-2xl md:text-3xl text-ink leading-tight mt-4">
        {question.question}
      </h2>

      <div className="mt-6 hairline" />

      <div className="mt-6">{renderQuestionContent()}</div>
    </article>
  );
}
