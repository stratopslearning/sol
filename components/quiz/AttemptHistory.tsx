"use client";
import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, Trophy, RefreshCw, AlertCircle } from 'lucide-react';

interface Attempt {
  id: string;
  score: number;
  maxScore: number;
  percentage: number;
  submittedAt: string;
  attemptNumber: number;
  gptFeedback?: any;
}

interface AttemptHistoryProps {
  quizId: string;
  assignmentId: string;
  onRetake?: () => void;
}

export function AttemptHistory({ quizId, assignmentId, onRetake }: AttemptHistoryProps) {
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [bestScore, setBestScore] = useState(0);
  const [bestPercentage, setBestPercentage] = useState(0);
  const [totalAttempts, setTotalAttempts] = useState(0);
  const [maxAttempts, setMaxAttempts] = useState(1);
  const [attemptsRemaining, setAttemptsRemaining] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAttemptHistory();
  }, [quizId, assignmentId]);

  const fetchAttemptHistory = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/quiz/${quizId}/attempts?assignmentId=${assignmentId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch attempts');
      }

      setAttempts(data.attempts);
      setBestScore(data.bestScore);
      setBestPercentage(data.bestPercentage);
      setTotalAttempts(data.totalAttempts);
      setMaxAttempts(data.maxAttempts);
      setAttemptsRemaining(data.attemptsRemaining);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load attempts');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="bg-white/5 border-white/10">
        <CardContent className="p-6 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white/60">Loading attempt history...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-red-900/20 border-red-500/30">
        <CardContent className="p-6 text-center">
          <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-4" />
          <p className="text-red-300">Error: {error}</p>
          <Button 
            onClick={fetchAttemptHistory} 
            variant="outline" 
            className="mt-4 text-red-300 border-red-500 hover:bg-red-900/30"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (attempts.length === 0) {
    return (
      <Card className="bg-white/5 border-white/10">
        <CardContent className="p-6 text-center">
          <p className="text-white/60">No attempts yet. Take the quiz to get started!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Best Score Summary */}
      <Card className="bg-gradient-to-r from-green-900/20 to-blue-900/20 border-green-500/30">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-400" />
            Best Score
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center">
            <div className="text-3xl font-bold text-green-400 mb-2">
              {bestScore}/{attempts[0]?.maxScore || 0}
            </div>
            <div className="text-lg text-green-300 mb-4">
              {bestPercentage}%
            </div>
            <div className="flex items-center justify-center gap-4 text-sm text-white/60">
              <span>Total Attempts: {totalAttempts}</span>
              <span>Max Attempts: {maxAttempts}</span>
              <span>Remaining: {attemptsRemaining}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Attempt History */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="text-white">Attempt History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {attempts.map((attempt) => (
              <div
                key={attempt.id}
                className={`flex items-center justify-between p-3 rounded-lg border ${
                  attempt.score === bestScore && attempt.score > 0
                    ? 'bg-green-900/20 border-green-500/30'
                    : 'bg-white/5 border-white/10'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="text-xs">
                    Attempt {attempt.attemptNumber}
                  </Badge>
                  <div className="flex items-center gap-2 text-sm text-white/60">
                    <Clock className="w-3 h-3" />
                    {new Date(attempt.submittedAt).toLocaleDateString()}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-semibold text-white">
                    {attempt.score}/{attempt.maxScore}
                  </div>
                  <div className="text-sm text-white/60">
                    {attempt.percentage}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Retake Button */}
      {attemptsRemaining > 0 && onRetake && (
        <Card className="bg-blue-900/20 border-blue-500/30">
          <CardContent className="p-6 text-center">
            <p className="text-blue-300 mb-4">
              You have {attemptsRemaining} attempt{attemptsRemaining > 1 ? 's' : ''} remaining
            </p>
            <Button onClick={onRetake} className="bg-blue-600 hover:bg-blue-700">
              <RefreshCw className="w-4 h-4 mr-2" />
              Retake Quiz
            </Button>
          </CardContent>
        </Card>
      )}

      {attemptsRemaining === 0 && (
        <Card className="bg-orange-900/20 border-orange-500/30">
          <CardContent className="p-6 text-center">
            <p className="text-orange-300">
              Maximum attempts reached. Your best score is {bestScore}/{attempts[0]?.maxScore || 0} ({bestPercentage}%)
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
