"use client";

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Circle } from 'lucide-react';

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
  onQuestionSelect 
}: QuizNavigationProps) {
  const isQuestionAnswered = (questionId: string) => {
    const answer = answers[questionId];
    if (!answer) return false;
    
    // Check if the answer is not empty
    if (typeof answer === 'string') {
      return answer.trim().length > 0;
    }
    
    return true;
  };

  const getQuestionStatus = (question: any, index: number) => {
    if (index === currentQuestionIndex) {
      return 'current';
    }
    if (isQuestionAnswered(question.id)) {
      return 'answered';
    }
    return 'unanswered';
  };

  const getQuestionButtonStyle = (status: string) => {
    switch (status) {
      case 'current':
        return 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700';
      case 'answered':
        return 'bg-green-600 text-white border-green-600 hover:bg-green-700';
      case 'unanswered':
        return 'bg-gray-700 text-gray-300 border-gray-600 hover:bg-gray-600';
      default:
        return 'bg-gray-700 text-gray-300 border-gray-600';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg text-white">Question Navigation</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-5 gap-2">
          {questions.map((question, index) => {
            const status = getQuestionStatus(question, index);
            const isAnswered = isQuestionAnswered(question.id);
            
            return (
              <Button
                key={question.id}
                variant="outline"
                size="sm"
                className={`h-10 w-10 p-0 ${getQuestionButtonStyle(status)}`}
                onClick={() => onQuestionSelect(index)}
              >
                <div className="flex items-center justify-center">
                  {isAnswered ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <span className="text-xs font-medium">{index + 1}</span>
                  )}
                </div>
              </Button>
            );
          })}
        </div>
        
        <div className="mt-4 space-y-2 text-sm">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
            <span className="text-gray-400">Current</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-600 rounded-full"></div>
            <span className="text-gray-400">Answered</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-gray-600 rounded-full"></div>
            <span className="text-gray-400">Unanswered</span>
          </div>
        </div>
        
        <div className="mt-4 p-3 bg-gray-800 rounded-lg">
          <div className="text-sm text-gray-400">
            <div>Total: {questions.length}</div>
            <div>Answered: {Object.keys(answers).length}</div>
            <div>Remaining: {questions.length - Object.keys(answers).length}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 