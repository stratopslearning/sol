"use client";

import { useState } from "react";

import { GPTFeedbackDisplay } from "@/components/quiz/GPTFeedbackDisplay";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiUrl } from "@/lib/basePath";

export default function TestGradingPage() {
  const [question, setQuestion] = useState(
    "Explain the concept of photosynthesis in detail.",
  );
  const [studentAnswer, setStudentAnswer] = useState("");
  const [correctAnswer, setCorrectAnswer] = useState(
    "Photosynthesis is the process by which plants convert light energy into chemical energy to produce glucose and oxygen.",
  );
  const [maxPoints, setMaxPoints] = useState(10);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleTestGrading = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch(apiUrl("/api/test-grading"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          studentAnswer,
          correctAnswer,
          maxPoints: parseInt(maxPoints.toString()),
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to test grading");
      setResult(data.result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-paper text-ink p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <header>
          <span className="eyebrow text-ink-faint">Internal · Debug</span>
          <h1 className="font-display text-3xl text-ink mt-2">
            GPT grading harness
          </h1>
          <p className="mt-2 text-sm text-ink-muted">
            Test the AI grading endpoint with arbitrary inputs.
          </p>
        </header>

        <section className="paper paper-shadow p-6 space-y-4">
          <h2 className="font-display text-lg text-ink">Configuration</h2>
          <div className="flex flex-col gap-2">
            <Label htmlFor="question">Question</Label>
            <Textarea
              id="question"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              rows={2}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="studentAnswer">Student answer</Label>
            <Textarea
              id="studentAnswer"
              value={studentAnswer}
              onChange={(e) => setStudentAnswer(e.target.value)}
              rows={4}
              placeholder="Enter a test student answer…"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="correctAnswer">Correct answer (optional)</Label>
            <Textarea
              id="correctAnswer"
              value={correctAnswer}
              onChange={(e) => setCorrectAnswer(e.target.value)}
              rows={2}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="maxPoints">Maximum points</Label>
            <Input
              id="maxPoints"
              type="number"
              value={maxPoints}
              onChange={(e) => setMaxPoints(parseInt(e.target.value))}
              className="w-32"
              min="1"
              max="20"
            />
          </div>
          <Button
            onClick={handleTestGrading}
            disabled={loading || !studentAnswer.trim()}
            loading={loading}
            className="w-full"
          >
            {loading ? "Testing…" : "Run test"}
          </Button>
        </section>

        {error && (
          <section className="paper paper-shadow p-4 border-danger/40 bg-danger-soft/40">
            <p className="text-sm text-danger">Error: {error}</p>
          </section>
        )}

        {result && (
          <div className="space-y-4">
            <section className="paper paper-shadow p-4 border-success/40 bg-success-soft/40">
              <h3 className="eyebrow text-success-fg mb-2">Raw API response</h3>
              <pre className="text-xs font-mono text-ink overflow-auto whitespace-pre-wrap">
                {JSON.stringify(result, null, 2)}
              </pre>
            </section>
            <GPTFeedbackDisplay
              feedback={result}
              questionText={question}
              studentAnswer={studentAnswer}
            />
          </div>
        )}
      </div>
    </div>
  );
}
