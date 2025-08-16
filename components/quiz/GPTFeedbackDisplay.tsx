import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Brain, 
  Lightbulb, 
  Target, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  TrendingUp,
  MessageSquare
} from 'lucide-react';

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
  questionText, 
  studentAnswer, 
  className = "" 
}: GPTFeedbackDisplayProps) {
  return (
    <Card className={`bg-gradient-to-br from-blue-900/20 to-purple-900/20 border-blue-500/30 ${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg text-white flex items-center gap-2">
          AI Feedback
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-white">Feedback</span>
          </div>
          <div className="p-3 bg-white/5 rounded-lg">
            <p className="text-sm text-gray-200 leading-relaxed">
              {feedback.feedback}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-2">
          <span className="text-sm font-medium text-white">Score:</span>
          <span className="text-lg font-bold text-blue-300">{feedback.score}</span>
        </div>
      </CardContent>
    </Card>
  );
} 