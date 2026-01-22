"use client";

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Circle } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';

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

  const answeredCount = Object.keys(answers).filter(key => {
    const answer = answers[key];
    return answer && (typeof answer !== 'string' || answer.trim().length > 0);
  }).length;
  const progress = (answeredCount / questions.length) * 100;

  return (
    <Card className="bg-white/10 border-white/10 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-lg text-white">Question Navigation</CardTitle>
        <div className="mt-2">
          <Progress value={progress} className="h-2" />
          <div className="flex justify-between text-xs text-white/60 mt-1">
            <span>{answeredCount} of {questions.length} answered</span>
            <span>{Math.round(progress)}%</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
          {questions.map((question, index) => {
            const status = getQuestionStatus(question, index);
            const isAnswered = isQuestionAnswered(question.id);
            const isCurrent = index === currentQuestionIndex;
            
            return (
              <motion.div
                key={question.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
              >
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    "h-10 w-10 p-0 transition-all duration-200 relative",
                    isCurrent && "bg-blue-600 text-white border-blue-600 hover:bg-blue-700 ring-2 ring-blue-400/50 scale-110",
                    !isCurrent && isAnswered && "bg-green-600/80 text-white border-green-600 hover:bg-green-700 hover:scale-105",
                    !isCurrent && !isAnswered && "bg-white/5 text-white/60 border-white/20 hover:bg-white/10 hover:text-white hover:scale-105"
                  )}
                  onClick={() => onQuestionSelect(index)}
                  aria-label={`Go to question ${index + 1}${isAnswered ? ' (answered)' : ''}`}
                >
                  <div className="flex items-center justify-center">
                    {isAnswered ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      <span className="text-xs font-medium">{index + 1}</span>
                    )}
                  </div>
                  {isCurrent && (
                    <motion.div
                      layoutId="currentQuestionIndicator"
                      className="absolute inset-0 border-2 border-blue-400 rounded-md pointer-events-none"
                      initial={false}
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    />
                  )}
                </Button>
              </motion.div>
            );
          })}
        </div>
        
        <div className="mt-6 space-y-2 text-sm">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-blue-600 rounded-full ring-2 ring-blue-400/50"></div>
            <span className="text-white/60">Current</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-600 rounded-full"></div>
            <span className="text-white/60">Answered</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-white/20 rounded-full border border-white/30"></div>
            <span className="text-white/60">Unanswered</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 