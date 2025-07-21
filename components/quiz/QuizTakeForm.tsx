"use client";

import * as React from "react";
import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { QuizTimer } from "@/components/quiz/QuizTimer";
import { useRouter } from "next/navigation";
import { useRef, useEffect } from "react";

interface QuizTakeFormProps {
  quiz: {
    id: string;
    title: string;
    description?: string;
    timeLimit?: number;
    dueDate?: string | null;
    totalQuestions: number;
  };
  questions: Array<{
    id: string;
    type: "MULTIPLE_CHOICE" | "TRUE_FALSE" | "SHORT_ANSWER";
    question: string;
    options?: string[];
    order: number;
    points: number;
  }>;
  assignmentId: string;
  userId: string;
}

type AnswerMap = Record<string, string>;

type ResultMap = {
  correct: boolean;
  feedback?: string;
};

export function QuizTakeForm({ quiz, questions, assignmentId, userId }: QuizTakeFormProps) {
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [results, setResults] = useState<Record<string, ResultMap> | null>(null);
  const [score, setScore] = useState<number | null>(null);
  const [percentage, setPercentage] = useState<number | null>(null);
  const [gptFeedback, setGptFeedback] = useState<Record<string, string>>({});
  const [timeUp, setTimeUp] = useState(false);

  const router = useRouter();
  const submittingRef = useRef(false);

  // 1. Optionally: Create attempt on mount (pseudo-code, adjust to your backend)
  useEffect(() => {
    // If you want to POST to /api/quiz/[quizId]/start to create attempt, do it here
    // await fetch(`/api/quiz/${quiz.id}/start`, { method: "POST", body: JSON.stringify({ assignmentId, userId }) });
  }, [quiz.id, assignmentId, userId]);

  // 2. Auto-submit on exit if not all answered
  useEffect(() => {
    const handleAutoSubmit = async () => {
      if (submittingRef.current) return;
      submittingRef.current = true;
      try {
        await fetch(`/api/quiz/${quiz.id}/submit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ assignmentId, answers }),
        });
      } catch (err) {
        // Optionally handle error
      }
    };

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (Object.keys(answers).length < questions.length) {
        e.preventDefault();
        e.returnValue = "";
        handleAutoSubmit();
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    // For in-app navigation (Next.js)
    const handleRouteChange = (url: string) => {
      if (Object.keys(answers).length < questions.length) {
        if (!window.confirm("You haven’t answered all questions. Submit before leaving?")) {
          throw "Route change aborted by quiz lock";
        } else {
          handleAutoSubmit();
        }
      }
    };
    // @ts-ignore: router.events may not exist in App Router, but add for compatibility
    router.events?.on("routeChangeStart", handleRouteChange);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      // @ts-ignore
      router.events?.off("routeChangeStart", handleRouteChange);
    };
  }, [answers, questions.length, assignmentId, quiz.id, router]);

  const answeredCount = Object.keys(answers).length;
  const progress = Math.round((answeredCount / questions.length) * 100);

  // Auto-submit when time is up
  React.useEffect(() => {
    if (timeUp && !submitting) {
      // Simulate a submit event
      handleSubmit(new Event('submit') as any);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeUp]);

  const handleChange = (qid: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [qid]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(`/api/quiz/${quiz.id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignmentId, answers }),
      });
      if (!res.ok) throw new Error("Failed to submit quiz");
      const data = await res.json();
      window.location.href = `/quiz/${quiz.id}/results?attemptId=${data.attemptId}`;
    } catch (err) {
      toast.error("Submission failed", { description: (err as Error).message });
    } finally {
      setSubmitting(false);
    }
  };

  // --- UI ---
  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto py-8">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-2xl text-white">Quiz Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-2 mb-4">
              <div className="text-lg text-white font-semibold">Score: {score} / {questions.reduce((a, q) => a + q.points, 0)}</div>
            </div>
            <div className="mb-4">
              <Button asChild variant="secondary">
                <a href="/dashboard/student">Back to Dashboard</a>
              </Button>
            </div>
            <div className="space-y-6">
              {questions.map((q, idx) => (
                <Card key={q.id} className="bg-white/5 border border-white/10">
                  <CardHeader>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline">Question {idx + 1}</Badge>
                      <Badge variant="secondary">{q.type.replace("_", " ")}</Badge>
                      <span className="text-xs text-gray-400">{q.points} pts</span>
                    </div>
                    <CardTitle className="text-white text-base font-medium">{q.question}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-2">
                      <Label className="text-gray-300">Your answer:</Label>
                      <div className="mt-1 text-white/90">
                        {answers[q.id] || <span className="italic text-gray-400">No answer</span>}
                      </div>
                    </div>
                    {results && (
                      <div className="flex items-center gap-2 mt-2">
                        {results[q.id]?.correct ? (
                          <Badge className="bg-green-600/20 text-green-400 border-green-600">Correct</Badge>
                        ) : (
                          <Badge className="bg-red-600/20 text-red-400 border-red-600">Incorrect</Badge>
                        )}
                        {results[q.id]?.feedback && (
                          <span className="text-sm text-blue-300">{results[q.id].feedback}</span>
                        )}
                        {gptFeedback[q.id] && (
                          <span className="text-sm text-purple-300">AI: {gptFeedback[q.id]}</span>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="mt-8 text-center">
              <Button variant="outline" disabled>
                View Attempt History (coming soon)
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto py-8">
      <Card className="mb-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/10">
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
            <CardTitle className="text-2xl text-black dark:text-white">{quiz.title}</CardTitle>
            {quiz.timeLimit && (
              <QuizTimer timeLimit={quiz.timeLimit * 60} onTimeUp={() => setTimeUp(true)} />
            )}
          </div>
        </CardHeader>
        <CardContent>
          {quiz.description && <div className="mb-2 text-black dark:text-white/80">{quiz.description}</div>}
          <div className="flex flex-wrap gap-4 items-center mb-2">
            <Badge variant="secondary" className="text-black dark:text-white bg-gray-200 dark:bg-gray-800">{questions.length} questions</Badge>
            {quiz.dueDate && (
              <Badge variant="outline" className="text-black dark:text-white border-gray-400 dark:border-gray-600">Due: {new Date(quiz.dueDate).toLocaleDateString()}</Badge>
            )}
            {quiz.timeLimit && (
              <Badge variant="outline" className="text-black dark:text-white border-gray-400 dark:border-gray-600">Time limit: {quiz.timeLimit} min</Badge>
            )}
          </div>
          <div className="mb-2">
            <Progress value={progress} className="h-2" />
            <div className="text-xs text-black dark:text-gray-400 mt-1">{answeredCount} of {questions.length} answered</div>
          </div>
        </CardContent>
      </Card>
      <div className="space-y-8">
        {questions.map((q, idx) => (
          <Card key={q.id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/10">
            <CardHeader>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="text-black dark:text-white border-gray-400 dark:border-gray-600">Question {idx + 1} of {questions.length}</Badge>
                <Badge variant="secondary" className="text-black dark:text-white bg-gray-200 dark:bg-gray-800">{q.type.replace("_", " ")}</Badge>
                <span className="text-xs text-black dark:text-gray-400">{q.points} pts</span>
              </div>
              <CardTitle className="text-black dark:text-white text-base font-medium">{q.question}</CardTitle>
            </CardHeader>
            <CardContent>
              {q.type === "MULTIPLE_CHOICE" && q.options && (
                <>
                  {console.log('MCQ options for question', q.id, q.options)}
                  <RadioGroup
                    value={answers[q.id] || ""}
                    onValueChange={(val) => handleChange(q.id, val)}
                    disabled={submitting}
                    className="space-y-2"
                  >
                    {q.options.map((opt, i) => (
                      <div key={i} className="flex items-center space-x-2">
                        <RadioGroupItem value={opt} id={`${q.id}-opt-${i}`} />
                        <Label htmlFor={`${q.id}-opt-${i}`} className="text-black dark:text-white cursor-pointer">
                          {opt}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </>
              )}
              {q.type === "TRUE_FALSE" && (
                <RadioGroup
                  value={answers[q.id] || ""}
                  onValueChange={(val) => handleChange(q.id, val)}
                  disabled={submitting}
                  className="space-y-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="true" id={`${q.id}-true`} />
                    <Label htmlFor={`${q.id}-true`} className="text-black dark:text-white cursor-pointer">True</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="false" id={`${q.id}-false`} />
                    <Label htmlFor={`${q.id}-false`} className="text-black dark:text-white cursor-pointer">False</Label>
                  </div>
                </RadioGroup>
              )}
              {q.type === "SHORT_ANSWER" && (
                <Textarea
                  value={answers[q.id] || ""}
                  onChange={(e) => handleChange(q.id, e.target.value)}
                  placeholder="Type your answer here..."
                  disabled={submitting}
                  className="min-h-[100px] resize-none text-black dark:text-white bg-gray-100 dark:bg-gray-800"
                />
              )}
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="mt-8 flex justify-end">
        <Button type="submit" disabled={submitting} className="w-full md:w-auto">
          {submitting ? "Submitting..." : "Submit Quiz"}
        </Button>
      </div>
    </form>
  );
} 