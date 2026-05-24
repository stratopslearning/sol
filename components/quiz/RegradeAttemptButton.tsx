'use client';

import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { apiUrl } from '@/lib/basePath';

type RegradeAttemptButtonProps = {
  attemptId: string;
  fallbackQuestionCount: number;
};

export function RegradeAttemptButton({
  attemptId,
  fallbackQuestionCount,
}: RegradeAttemptButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  async function handleRegrade() {
    const label =
      fallbackQuestionCount > 0
        ? `Re-grade ${fallbackQuestionCount} response${fallbackQuestionCount === 1 ? '' : 's'} with AI? This may take up to a minute.`
        : 'Re-grade all short-answer responses with AI? This may take up to a minute.';

    if (!confirm(label)) {
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(
        apiUrl(`/api/professor/attempt/${attemptId}/regrade`),
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fallbackOnly: true }),
        },
      );

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        toast.error(data?.error ?? 'Failed to re-grade attempt');
        return;
      }

      toast.success(
        data.regradedQuestionCount > 0
          ? `Re-graded ${data.regradedQuestionCount} response${data.regradedQuestionCount === 1 ? '' : 's'}. New score: ${data.percentage}%.`
          : 'No fallback-graded responses needed re-grading.',
      );

      if (data.regradedQuestionCount > 0) {
        window.location.reload();
      }
    } catch (error) {
      console.error('Re-grade error:', error);
      toast.error('Failed to re-grade attempt');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2 sm:items-end">
      {fallbackQuestionCount > 0 ? (
        <p className="text-xs text-warning-fg max-w-sm text-right">
          {fallbackQuestionCount} response
          {fallbackQuestionCount === 1 ? '' : 's'} used fallback grading and
          may need a fresh AI review.
        </p>
      ) : null}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleRegrade}
        disabled={isLoading}
      >
        <RefreshCw
          className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`}
        />
        {isLoading ? 'Re-grading…' : 'Re-grade with AI'}
      </Button>
    </div>
  );
}
