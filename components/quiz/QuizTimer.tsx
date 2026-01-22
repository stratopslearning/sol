"use client";

import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Clock, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

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

  const progress = (timeRemaining / timeLimit) * 100;
  const isWarning = timeRemaining <= 300; // 5 minutes
  const isCritical = timeRemaining <= 60; // 1 minute

  const getTimeColor = () => {
    if (isCritical) return 'text-red-500';
    if (isWarning) return 'text-yellow-500';
    return 'text-blue-400';
  };

  const getProgressColor = () => {
    if (isCritical) return 'bg-red-500';
    if (isWarning) return 'bg-yellow-500';
    return 'bg-blue-500';
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Clock className={cn("w-4 h-4", getTimeColor())} />
        <Badge 
          variant="outline" 
          className={cn(
            "font-mono text-base px-3 py-1.5 border-2 transition-all duration-300",
            isCritical && "border-red-500/50 bg-red-500/10 animate-pulse",
            isWarning && !isCritical && "border-yellow-500/50 bg-yellow-500/10",
            !isWarning && "border-blue-500/50 bg-blue-500/10",
            getTimeColor()
          )}
        >
          {formatTime(timeRemaining)}
        </Badge>
        {isWarning && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-1 text-yellow-500"
          >
            <AlertTriangle className="w-4 h-4" />
            <span className="text-xs font-medium">
              {isCritical ? 'Time almost up!' : 'Less than 5 minutes'}
            </span>
          </motion.div>
        )}
      </div>
      <div className="w-full">
        <Progress 
          value={progress} 
          className="h-2"
        />
        <div 
          className={cn(
            "h-2 rounded-full transition-all duration-1000",
            getProgressColor()
          )}
          style={{ width: `${progress}%`, marginTop: '-8px' }}
        />
      </div>
    </div>
  );
} 