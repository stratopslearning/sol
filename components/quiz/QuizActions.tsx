'use client';

import { Button } from '@/components/ui/button';
import { Edit, Eye, Copy, Archive } from 'lucide-react';

interface QuizActionsProps {
  quizId: string;
  isActive: boolean;
}

export function QuizActions({ quizId, isActive }: QuizActionsProps) {
  const handleDuplicate = async () => {
    if (confirm('Duplicate this quiz?')) {
      try {
        const response = await fetch(`/api/professor/quiz/${quizId}/duplicate`, {
          method: 'POST',
        });
        if (response.ok) {
          window.location.reload();
        } else {
          alert('Failed to duplicate quiz');
        }
      } catch (error) {
        console.error('Error duplicating quiz:', error);
        alert('Failed to duplicate quiz');
      }
    }
  };

  const handleArchive = async () => {
    if (confirm(`Are you sure you want to ${isActive ? 'archive' : 'activate'} this quiz?`)) {
      try {
        const response = await fetch(`/api/professor/quiz/${quizId}/archive`, {
          method: 'POST',
        });
        if (response.ok) {
          window.location.reload();
        } else {
          alert('Failed to archive quiz');
        }
      } catch (error) {
        console.error('Error archiving quiz:', error);
        alert('Failed to archive quiz');
      }
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button asChild variant="ghost" size="sm" className="text-white hover:text-white hover:bg-white/10">
        <a href={`/dashboard/professor/quiz/${quizId}/results`}>
          <Eye className="w-4 h-4" />
        </a>
      </Button>
      <Button asChild variant="ghost" size="sm" className="text-white hover:text-white hover:bg-white/10">
        <a href={`/dashboard/professor/quiz/${quizId}/edit`}>
          <Edit className="w-4 h-4" />
        </a>
      </Button>
      <Button 
        variant="ghost" 
        size="sm"
        className="text-white hover:text-white hover:bg-white/10"
        onClick={handleDuplicate}
      >
        <Copy className="w-4 h-4" />
      </Button>
      <Button 
        variant="ghost" 
        size="sm"
        className="text-white hover:text-white hover:bg-white/10"
        onClick={handleArchive}
      >
        <Archive className="w-4 h-4" />
      </Button>
    </div>
  );
} 