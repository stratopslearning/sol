'use client';

import { useState } from 'react';
import { Send } from '@/components/icons';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { apiUrl } from '@/lib/basePath';
import { quizGradesAreReleased } from '@/lib/professor/gradesReleased';

type ReleaseQuizGradesButtonProps = {
  quizId: string;
  gradesReleasedAt: string | null;
};

export function ReleaseQuizGradesButton({
  quizId,
  gradesReleasedAt,
}: ReleaseQuizGradesButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const released = quizGradesAreReleased({
    gradesReleasedAt: gradesReleasedAt ? new Date(gradesReleasedAt) : null,
  });

  async function handleRelease() {
    if (
      !confirm(
        'Release grades to learners? They will see scores, rubric feedback, and any instructor adjustments.',
      )
    ) {
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(
        apiUrl(`/api/professor/quiz/${quizId}/release-grades`),
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        },
      );
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(data?.error ?? 'Failed to release grades');
        return;
      }
      toast.success('Grades released to learners.');
      window.location.reload();
    } catch (err) {
      console.error(err);
      toast.error('Failed to release grades');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Badge variant={released ? 'success' : 'outline'}>
        {released ? 'Grades released' : 'Not released'}
      </Badge>
      {!released ? (
        <Button
          type="button"
          size="sm"
          onClick={handleRelease}
          disabled={isLoading}
        >
          <Send className="mr-2 h-4 w-4" />
          {isLoading ? 'Releasing…' : 'Release grades'}
        </Button>
      ) : null}
    </div>
  );
}
