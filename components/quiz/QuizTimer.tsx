"use client";

import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';

interface QuizTimerProps {
  timeLimit: number; // in seconds
  onTimeUp: () => void;
}

export function QuizTimer({ timeLimit, onTimeUp }: QuizTimerProps) {
  const [timeRemaining, setTimeRemaining] = useState(timeLimit);

  useEffect(() => {
    if (timeRemaining <= 0) {
      onTimeUp();
      return;
    }

    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          onTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeRemaining, onTimeUp]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimeColor = () => {
    if (timeRemaining <= 300) return 'text-red-500'; // 5 minutes or less
    if (timeRemaining <= 600) return 'text-yellow-500'; // 10 minutes or less
    return 'text-gray-400';
  };

  return (
    <Badge variant="outline" className={`font-mono ${getTimeColor()}`}>
      {formatTime(timeRemaining)}
    </Badge>
  );
} 