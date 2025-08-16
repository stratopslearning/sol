'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { GPTFeedbackDisplay } from '@/components/quiz/GPTFeedbackDisplay';

export default function TestGradingPage() {
  const [question, setQuestion] = useState('Explain the concept of photosynthesis in detail.');
  const [studentAnswer, setStudentAnswer] = useState('');
  const [correctAnswer, setCorrectAnswer] = useState('Photosynthesis is the process by which plants convert light energy into chemical energy to produce glucose and oxygen.');
  const [maxPoints, setMaxPoints] = useState(10);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleTestGrading = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/test-grading', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question,
          studentAnswer,
          correctAnswer,
          maxPoints: parseInt(maxPoints.toString()),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to test grading');
      }

      setResult(data.result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#030303] p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white mb-2">GPT Grading Test</h1>
          <p className="text-gray-400">Test the AI grading functionality</p>
        </div>

        <Card className="bg-white/10 border-white/20">
          <CardHeader>
            <CardTitle className="text-white">Test Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="question" className="text-white">Question</Label>
              <Textarea
                id="question"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                className="bg-white/5 border-white/20 text-white"
                rows={2}
              />
            </div>

            <div>
              <Label htmlFor="studentAnswer" className="text-white">Student Answer</Label>
              <Textarea
                id="studentAnswer"
                value={studentAnswer}
                onChange={(e) => setStudentAnswer(e.target.value)}
                className="bg-white/5 border-white/20 text-white"
                rows={4}
                placeholder="Enter a test student answer..."
              />
            </div>

            <div>
              <Label htmlFor="correctAnswer" className="text-white">Correct Answer (Optional)</Label>
              <Textarea
                id="correctAnswer"
                value={correctAnswer}
                onChange={(e) => setCorrectAnswer(e.target.value)}
                className="bg-white/5 border-white/20 text-white"
                rows={2}
              />
            </div>

            <div>
              <Label htmlFor="maxPoints" className="text-white">Maximum Points</Label>
              <Input
                id="maxPoints"
                type="number"
                value={maxPoints}
                onChange={(e) => setMaxPoints(parseInt(e.target.value))}
                className="bg-white/5 border-white/20 text-white w-32"
                min="1"
                max="20"
              />
            </div>

            <Button 
              onClick={handleTestGrading} 
              disabled={loading || !studentAnswer.trim()}
              className="w-full"
            >
              {loading ? 'Testing...' : 'Test Grading'}
            </Button>
          </CardContent>
        </Card>

        {error && (
          <Card className="bg-red-900/20 border-red-500/30">
            <CardContent className="p-4">
              <p className="text-red-300">Error: {error}</p>
            </CardContent>
          </Card>
        )}

        {result && (
          <div className="space-y-4">
            <Card className="bg-green-900/20 border-green-500/30">
              <CardContent className="p-4">
                <h3 className="text-green-300 font-semibold mb-2">Raw API Response:</h3>
                <pre className="text-green-200 text-sm overflow-auto">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </CardContent>
            </Card>

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