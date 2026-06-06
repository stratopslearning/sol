'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { compareNullableNumbers, sortRows } from '@/lib/listSort';
import {
  comparePersonsByLastName,
  formatPersonName,
  type PersonNameFields,
} from '@/lib/personName';

type GradebookQuiz = { id: string; title: string };

type GradebookCell = {
  percentage: number;
  score: number;
  maxScore: number;
  attemptId?: string;
};

export type GradebookLearnerRow = {
  id: string;
  person: PersonNameFields & { email: string | null };
  cells: Record<string, GradebookCell | undefined>;
  average: number | null;
};

type GradebookSortMode = 'LAST_NAME' | 'AVERAGE_DESC' | 'AVERAGE_ASC';

export function SectionGradebookTable({
  learners,
  quizzes,
}: {
  learners: GradebookLearnerRow[];
  quizzes: GradebookQuiz[];
}) {
  const [sortMode, setSortMode] = useState<GradebookSortMode>('LAST_NAME');

  const sortedLearners = useMemo(() => {
    if (sortMode === 'LAST_NAME') {
      return sortRows(learners, (a, b) =>
        comparePersonsByLastName(a.person, b.person),
      );
    }
    if (sortMode === 'AVERAGE_DESC') {
      return sortRows(learners, (a, b) =>
        compareNullableNumbers(a.average, b.average),
      ).reverse();
    }
    return sortRows(learners, (a, b) =>
      compareNullableNumbers(a.average, b.average),
    );
  }, [learners, sortMode]);

  const quizAverages = useMemo(() => {
    return quizzes.map((quiz) => {
      const percentages = learners
        .map((l) => l.cells[quiz.id]?.percentage)
        .filter((p): p is number => p != null);
      const avg =
        percentages.length > 0
          ? Math.round(
              percentages.reduce((sum, p) => sum + p, 0) / percentages.length,
            )
          : 0;
      return { quizId: quiz.id, average: avg };
    });
  }, [learners, quizzes]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Select
          value={sortMode}
          onValueChange={(v) => setSortMode(v as GradebookSortMode)}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Sort learners" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="LAST_NAME">Last name A–Z</SelectItem>
            <SelectItem value="AVERAGE_DESC">Average (high to low)</SelectItem>
            <SelectItem value="AVERAGE_ASC">Average (low to high)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="paper paper-shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-surface-sunken/40 border-b border-rule">
              <th className="px-4 py-3 text-left eyebrow text-ink-faint">Learner</th>
              {quizzes.map((quiz) => (
                <th
                  key={quiz.id}
                  className="px-4 py-3 text-left eyebrow text-ink-faint min-w-[140px]"
                >
                  {quiz.title}
                </th>
              ))}
              <th className="px-4 py-3 text-right eyebrow text-ink-faint">
                Average
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-rule">
            {sortedLearners.map((learner) => (
              <tr key={learner.id} className="hover:bg-surface-sunken/40">
                <td className="px-4 py-3 align-top">
                  <div className="flex flex-col">
                    <span className="font-medium text-ink">
                      {formatPersonName(learner.person)}
                    </span>
                    <span className="text-xs text-ink-faint">
                      {learner.person.email}
                    </span>
                  </div>
                </td>
                {quizzes.map((quiz) => {
                  const cell = learner.cells[quiz.id];
                  return (
                    <td key={quiz.id} className="px-4 py-3 tnum text-ink">
                      {cell ? (
                        cell.attemptId ? (
                          <Link
                            href={`/dashboard/professor/attempt/${cell.attemptId}`}
                            className="flex flex-col hover:text-brand transition-colors"
                          >
                            <span>{cell.percentage}%</span>
                            <span className="text-xs text-ink-faint">
                              {cell.score}/{cell.maxScore}
                            </span>
                          </Link>
                        ) : (
                          <div className="flex flex-col">
                            <span>{cell.percentage}%</span>
                            <span className="text-xs text-ink-faint">
                              {cell.score}/{cell.maxScore}
                            </span>
                          </div>
                        )
                      ) : (
                        <span className="text-ink-faint">—</span>
                      )}
                    </td>
                  );
                })}
                <td className="px-4 py-3 text-right tnum">
                  {learner.average != null ? (
                    <span className="font-display text-lg text-ink">
                      {learner.average}%
                    </span>
                  ) : (
                    <span className="text-ink-faint">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-rule-strong bg-surface-sunken/40">
              <td className="px-4 py-3 eyebrow text-ink-muted">Quiz average</td>
              {quizAverages.map((q) => (
                <td
                  key={q.quizId}
                  className="px-4 py-3 tnum font-display text-ink"
                >
                  {q.average}%
                </td>
              ))}
              <td className="px-4 py-3 text-right text-ink-faint">—</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
