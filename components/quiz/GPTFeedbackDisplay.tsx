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
  maxPoints: number;
  feedback: string;
  confidence: number;
  reasoning: string;
  keywords: string[];
  suggestions: string[];
  gradedAt?: string;
  error?: boolean;
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
  const percentage = feedback.maxPoints > 0 ? (feedback.score / feedback.maxPoints) * 100 : 0;
  const isError = feedback.error;
  const isHighConfidence = feedback.confidence >= 80;
  const isMediumConfidence = feedback.confidence >= 60 && feedback.confidence < 80;

  const getConfidenceColor = () => {
    if (isHighConfidence) return 'text-green-400';
    if (isMediumConfidence) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getConfidenceIcon = () => {
    if (isHighConfidence) return <CheckCircle className="w-4 h-4" />;
    if (isMediumConfidence) return <AlertTriangle className="w-4 h-4" />;
    return <AlertTriangle className="w-4 h-4" />;
  };

  const getScoreColor = () => {
    if (percentage >= 90) return 'text-green-400';
    if (percentage >= 80) return 'text-blue-400';
    if (percentage >= 70) return 'text-yellow-400';
    if (percentage >= 60) return 'text-orange-400';
    return 'text-red-400';
  };

  return (
    <Card className={`bg-gradient-to-br from-blue-900/20 to-purple-900/20 border-blue-500/30 ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg text-white flex items-center gap-2">
            <Brain className="w-5 h-5 text-blue-400" />
            AI Feedback
            {isError && (
              <Badge variant="destructive" className="text-xs">
                Fallback Mode
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {feedback.score}/{feedback.maxPoints} pts
            </Badge>
            <Badge 
              variant="secondary" 
              className={`text-xs ${getScoreColor()}`}
            >
              {Math.round(percentage)}%
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Score Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-300">Score</span>
            <span className={`font-medium ${getScoreColor()}`}>
              {feedback.score} / {feedback.maxPoints} points
            </span>
          </div>
          <Progress 
            value={percentage} 
            className="h-2"
            style={{
              '--progress-background': 'rgba(59, 130, 246, 0.2)',
              '--progress-foreground': percentage >= 80 ? '#10b981' : percentage >= 60 ? '#f59e0b' : '#ef4444'
            } as React.CSSProperties}
          />
        </div>

        {/* Confidence Indicator */}
        <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-blue-400" />
            <span className="text-sm text-gray-300">AI Confidence</span>
          </div>
          <div className="flex items-center gap-2">
            {getConfidenceIcon()}
            <span className={`text-sm font-medium ${getConfidenceColor()}`}>
              {feedback.confidence}%
            </span>
          </div>
        </div>

        {/* Main Feedback */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-medium text-white">Detailed Feedback</span>
          </div>
          <div className="p-3 bg-white/5 rounded-lg">
            <p className="text-sm text-gray-200 leading-relaxed">
              {feedback.feedback}
            </p>
          </div>
        </div>

        {/* Reasoning */}
        {feedback.reasoning && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-400" />
              <span className="text-sm font-medium text-white">Scoring Reasoning</span>
            </div>
            <div className="p-3 bg-white/5 rounded-lg">
              <p className="text-sm text-gray-300 leading-relaxed">
                {feedback.reasoning}
              </p>
            </div>
          </div>
        )}

        {/* Keywords */}
        {feedback.keywords && feedback.keywords.length > 0 && (
          <div className="space-y-2">
            <span className="text-sm font-medium text-white">Key Concepts</span>
            <div className="flex flex-wrap gap-2">
              {feedback.keywords.map((keyword, index) => (
                <Badge 
                  key={index} 
                  variant="outline" 
                  className="text-xs bg-blue-500/10 border-blue-500/30 text-blue-300"
                >
                  {keyword}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Suggestions */}
        {feedback.suggestions && feedback.suggestions.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-yellow-400" />
              <span className="text-sm font-medium text-white">Improvement Suggestions</span>
            </div>
            <div className="space-y-2">
              {feedback.suggestions.map((suggestion, index) => (
                <div 
                  key={index} 
                  className="p-2 bg-yellow-500/10 border border-yellow-500/20 rounded text-sm text-yellow-200"
                >
                  • {suggestion}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Grading Timestamp */}
        {feedback.gradedAt && (
          <div className="flex items-center gap-2 text-xs text-gray-400 pt-2 border-t border-white/10">
            <Clock className="w-3 h-3" />
            <span>Graded at {new Date(feedback.gradedAt).toLocaleString()}</span>
          </div>
        )}

        {/* Error Notice */}
        {isError && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
            <div className="flex items-center gap-2 text-red-300 text-sm">
              <AlertTriangle className="w-4 h-4" />
              <span>AI grading temporarily unavailable. This is fallback feedback.</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 