import Link from 'next/link';
import { Check, Circle } from '@/components/icons';

import { appPath } from '@/lib/basePath';
import type { TeacherHomeChecklistStep } from '@/lib/professor/teacherHomeChecklist';

export function TeacherHomeChecklist({
  steps,
}: {
  steps: TeacherHomeChecklistStep[];
}) {
  const done = steps.filter((s) => s.done).length;

  return (
    <section
      className="rounded-xl border border-rule bg-surface-sunken/50 px-5 py-5 sm:px-6"
      aria-labelledby="teacher-checklist-heading"
    >
      <p className="eyebrow">Getting started</p>
      <h2
        id="teacher-checklist-heading"
        className="mt-1 font-display text-lg text-ink"
        style={{ fontVariationSettings: '"opsz" 36' }}
      >
        First assignment checklist
      </h2>
      <p className="mt-1 text-xs text-ink-muted">
        {done} of {steps.length} complete — from your workspace progress.
      </p>
      <ol className="mt-4 flex flex-col gap-2">
        {steps.map((step, index) => {
          const isDone = step.done;
          return (
            <li key={step.id} className="flex items-center gap-3">
              <span
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-rule bg-surface text-ink-muted"
                aria-hidden
              >
                {isDone ? (
                  <Check className="h-4 w-4 text-brand" aria-hidden />
                ) : (
                  <Circle className="h-4 w-4" aria-hidden />
                )}
              </span>
              <Link
                href={appPath(step.href)}
                className="text-sm text-ink hover:text-brand hover:underline"
              >
                <span className="sr-only">
                  Step {index + 1}
                  {isDone ? ', complete' : ', incomplete'}:
                </span>
                {step.label}
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
