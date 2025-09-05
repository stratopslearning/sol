"use client";

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

interface QuestionCardProps {
  question: any;
  questionNumber: number;
  answer: any;
  onAnswerChange: (answer: any) => void;
}

export function QuestionCard({ question, questionNumber, answer, onAnswerChange }: QuestionCardProps) {
  // Prevent copy/paste/cut operations
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Prevent Ctrl+C, Ctrl+V, Ctrl+X, Ctrl+A
    if (e.ctrlKey && (e.key === 'c' || e.key === 'v' || e.key === 'x' || e.key === 'a')) {
      e.preventDefault();
    }
    // Prevent right-click context menu shortcuts
    if (e.key === 'F10' || (e.shiftKey && e.key === 'F10')) {
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
      case 'MULTIPLE_CHOICE':
        return 'Multiple Choice';
      case 'TRUE_FALSE':
        return 'True/False';
      case 'SHORT_ANSWER':
        return 'Short Answer';
      default:
        return type;
    }
  };

  const renderQuestionContent = () => {
    switch (question.type) {
      case 'MULTIPLE_CHOICE':
        return (
          <RadioGroup
            value={answer || ''}
            onValueChange={onAnswerChange}
            className="space-y-3"
            onKeyDown={handleKeyDown}
            onContextMenu={handleContextMenu}
          >
            {question.options?.map((option: string, index: number) => (
              <div key={index} className="flex items-center space-x-2">
                <RadioGroupItem value={option} id={`option-${index}`} />
                <Label htmlFor={`option-${index}`} className="text-white cursor-pointer">
                  {option}
                </Label>
              </div>
            ))}
          </RadioGroup>
        );

      case 'TRUE_FALSE':
        return (
          <RadioGroup
            value={answer || ''}
            onValueChange={onAnswerChange}
            className="space-y-3"
            onKeyDown={handleKeyDown}
            onContextMenu={handleContextMenu}
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="true" id="true" />
              <Label htmlFor="true" className="text-white cursor-pointer">
                True
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="false" id="false" />
              <Label htmlFor="false" className="text-white cursor-pointer">
                False
              </Label>
            </div>
          </RadioGroup>
        );

      case 'SHORT_ANSWER':
        return (
          <div className="space-y-3">
            <Textarea
              placeholder="Enter your answer here..."
              value={answer || ''}
              onChange={(e) => onAnswerChange(e.target.value)}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              onContextMenu={handleContextMenu}
              className="min-h-[120px] resize-none"
              rows={4}
            />
            <p className="text-sm text-gray-400">
              Your answer will be graded using AI and you'll receive detailed feedback.
            </p>
          </div>
        );

      default:
        return <p className="text-red-400">Unsupported question type</p>;
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Badge variant="outline" className="text-sm">
              Question {questionNumber}
            </Badge>
            <Badge variant="secondary" className="text-sm">
              {getQuestionTypeLabel(question.type)}
            </Badge>
            {question.points > 1 && (
              <Badge variant="destructive" className="text-sm">
                {question.points} points
              </Badge>
            )}
          </div>
        </div>
        <CardTitle className="text-xl text-white mt-3">
          {question.question}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {renderQuestionContent()}
      </CardContent>
    </Card>
  );
} 