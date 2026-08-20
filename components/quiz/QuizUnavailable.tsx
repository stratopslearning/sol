'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { Clock, FileText } from 'lucide-react';
import { toast } from 'sonner';

import { EmptyState } from '@/components/patterns/EmptyState';
import { Button } from '@/components/ui/button';
import {
  getQuizBlockCopy,
  isInformationalQuizBlock,
  type QuizBlockCode,
} from '@/lib/quizBlockCopy';

export function QuizUnavailable({
  code,
  quizTitle,
  opensAtLabel,
  closedAtLabel,
}: {
  code: QuizBlockCode;
  quizTitle?: string | null;
  opensAtLabel?: string | null;
  closedAtLabel?: string | null;
}) {
  const copy = getQuizBlockCopy(code, { opensAtLabel, closedAtLabel });
  const toasted = useRef(false);

  useEffect(() => {
    if (toasted.current) return;
    toasted.current = true;
    const toastFn = isInformationalQuizBlock(code) ? toast.info : toast.error;
    toastFn(copy.title, { description: copy.description, duration: 8000 });
  }, [code, copy.description, copy.title]);

  return (
    <EmptyState
      icon={
        code === 'quiz_not_started' ? (
          <Clock className="h-5 w-5" />
        ) : (
          <FileText className="h-5 w-5" />
        )
      }
      eyebrow={quizTitle || 'Quiz'}
      title={copy.title}
      description={copy.description}
      actions={
        <Button asChild>
          <Link href="/dashboard/student/quizzes">Back to my quizzes</Link>
        </Button>
      }
    />
  );
}
