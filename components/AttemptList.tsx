"use client";

import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';

interface Attempt {
  id: string;
  quiz: {
    title: string;
  };
  section: {
    name: string;
  };
  percentage: number | null;
  passed: boolean | null;
}

interface AttemptListProps {
  attempts: Attempt[];
}

export function AttemptList({ attempts }: AttemptListProps) {
  if (attempts.length === 0) {
    return (
      <div className="text-center py-8 text-white/60 animate-fade-in">
        <div className="w-12 h-12 mx-auto mb-4 opacity-50 text-white/40">📝</div>
        <p className="text-base font-medium text-white/80 mb-2">No recent attempts</p>
        <div className="text-white/50 text-sm">Complete quizzes to see your attempts here.</div>
      </div>
    );
  }

  return (
    <>
      {attempts.map((attempt, index) => (
        <motion.div
          key={attempt.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
        >
          <div className="flex-1">
            <div className="text-sm font-medium text-white">
              {attempt.quiz.title}
            </div>
            <div className="text-xs text-white/60">
              {attempt.section.name} • {attempt.percentage ?? 0}%
            </div>
          </div>
          <Badge className={attempt.passed === true ? 'bg-green-600/20 text-green-400 border-green-600' : 'bg-red-600/20 text-red-400 border-red-600'}>
            {attempt.passed === true ? 'Passed' : 'Failed'}
          </Badge>
        </motion.div>
      ))}
    </>
  );
}
