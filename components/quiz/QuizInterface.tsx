"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircle, Clock } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { apiUrl, withBasePath } from "@/lib/basePath";

import { QuestionCard } from "./QuestionCard";
import { QuizNavigation } from "./QuizNavigation";
import { QuizTimer } from "./QuizTimer";

interface QuizInterfaceProps {
  quiz: any;
  questions: any[];
  assignment: any;
  user: any;
}

export function QuizInterface({ quiz, questions, assignment }: QuizInterfaceProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTimeUp, setIsTimeUp] = useState(false);
  const autoSubmitTriggeredRef = useRef(false);

  const currentQuestion = questions[currentQuestionIndex];
  const answeredCount = Object.keys(answers).length;
  const progress = (answeredCount / questions.length) * 100;
  const isLastQuestion = currentQuestionIndex === questions.length - 1;

  const handleAnswerChange = (questionId: string, answer: any) => {
    setAnswers((prev) => ({ ...prev, [questionId]: answer }));
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1);
    }
  };

  const handleQuestionSelect = (index: number) => {
    setCurrentQuestionIndex(index);
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const response = await fetch(apiUrl(`/api/quiz/${quiz.id}/submit`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignmentId: assignment.id, answers }),
      });

      if (response.ok) {
        const result = await response.json();
        window.location.href = withBasePath(
          `/quiz/${quiz.id}/results?attemptId=${result.attemptId}`,
        );
      } else {
        throw new Error("Failed to submit quiz");
      }
    } catch (error) {
      console.error("Error submitting quiz:", error);
      alert("Failed to submit quiz. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (!isTimeUp || isSubmitting || autoSubmitTriggeredRef.current) return;
    autoSubmitTriggeredRef.current = true;
    handleSubmit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTimeUp, isSubmitting]);

  if (!currentQuestion) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="paper paper-shadow p-10 max-w-md text-center">
          <p className="text-ink-muted">No questions found for this quiz.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-paper text-ink min-h-screen">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <header className="paper paper-shadow p-6 md:p-8 mb-8">
          <div className="flex items-start justify-between gap-6 flex-wrap">
            <div className="flex flex-col gap-2 max-w-prose">
              <span className="eyebrow text-ink-faint">In session</span>
              <h1 className="font-display text-3xl md:text-4xl text-ink leading-tight">
                {quiz.title}
              </h1>
              {quiz.course?.title ? (
                <p className="text-ink-muted">{quiz.course.title}</p>
              ) : null}
            </div>
            <div className="flex items-center gap-3">
              {quiz.timeLimit ? (
                <div className="inline-flex items-center gap-2 paper border border-rule px-3 py-2 rounded">
                  <Clock className="h-4 w-4 text-ink-faint" />
                  <QuizTimer
                    initialSeconds={quiz.timeLimit * 60}
                    onTimeUp={() => setIsTimeUp(true)}
                    paused={isSubmitting}
                  />
                </div>
              ) : null}
              <Badge variant="outline" className="tnum">
                {currentQuestionIndex + 1} / {questions.length}
              </Badge>
            </div>
          </div>

          <div className="mt-6 hairline" />
          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-xs text-ink-faint tnum">
              <span>Progress</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-1.5" />
            <div className="flex justify-between text-xs text-ink-faint tnum">
              <span>Answered: {answeredCount}</span>
              <span>Remaining: {questions.length - answeredCount}</span>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3">
            <QuestionCard
              question={currentQuestion}
              questionNumber={currentQuestionIndex + 1}
              answer={answers[currentQuestion.id]}
              onAnswerChange={(answer) =>
                handleAnswerChange(currentQuestion.id, answer)
              }
            />

            <div className="flex justify-between mt-6 gap-3">
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={currentQuestionIndex === 0}
              >
                Previous
              </Button>

              {!isLastQuestion ? (
                <Button onClick={handleNext}>Next question</Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  loading={isSubmitting}
                >
                  {isSubmitting ? "Submitting…" : "Submit quiz"}
                </Button>
              )}
            </div>
          </div>

          <div className="lg:col-span-1">
            <QuizNavigation
              questions={questions}
              answers={answers}
              currentQuestionIndex={currentQuestionIndex}
              onQuestionSelect={handleQuestionSelect}
            />
          </div>
        </div>

        {isTimeUp ? (
          <Alert className="mt-6" variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Time is up — your quiz is being submitted automatically.
            </AlertDescription>
          </Alert>
        ) : null}
      </div>
    </div>
  );
}
