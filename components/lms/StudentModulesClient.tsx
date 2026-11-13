'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState, useTransition } from 'react';

import {
  Check,
  ChevronDown,
  ChevronRight,
  FileText,
  Lock,
} from '@/components/icons';
import { withBasePath } from '@/lib/basePath';
import { cn } from '@/lib/utils';

type Item = {
  id: string;
  title: string;
  type: string;
  isHeader: boolean;
  quizId: string | null;
  lessonId: string | null;
  chatbotId: string | null;
  interactiveId: string | null;
  pageId: string | null;
  externalUrl: string | null;
  completionRequirement: { type: string; minPercent?: number } | null;
  completed?: boolean;
};

type ModuleRow = {
  id: string;
  title: string;
  locked?: boolean;
  lockReason?: string | null;
  prerequisiteModuleIds?: string[];
  items: Item[];
};

function itemHref(sectionId: string, item: Item): string | null {
  if (item.externalUrl) return item.externalUrl;
  if (item.quizId) {
    return withBasePath(`/dashboard/student/quiz/${item.quizId}`);
  }
  if (item.lessonId) {
    return withBasePath(`/dashboard/student/lessons/${item.lessonId}`);
  }
  if (item.chatbotId) {
    return withBasePath(`/dashboard/student/discussion/${item.chatbotId}`);
  }
  if (item.interactiveId) {
    return withBasePath(
      `/dashboard/student/interactive/${item.interactiveId}`,
    );
  }
  if (item.pageId) {
    return withBasePath(
      `/dashboard/student/sections/${sectionId}/pages/${item.pageId}`,
    );
  }
  return null;
}

function reqHint(item: Item): string | null {
  const r = item.completionRequirement;
  if (!r) return null;
  if (item.completed) {
    if (r.type === 'view') return 'Viewed';
    if (r.type === 'submit') {
      return item.type === 'LESSON'
        ? 'Section checks complete'
        : 'Submitted';
    }
    return 'Completed';
  }
  if (r.type === 'view') return 'Must view';
  if (r.type === 'submit') {
    return item.type === 'LESSON'
      ? 'Complete section checks'
      : 'Must submit';
  }
  if (r.type === 'score_at_least') {
    return `Score at least ${r.minPercent ?? 70}%`;
  }
  return null;
}

export function StudentModulesClient({
  sectionId,
  modules,
}: {
  sectionId: string;
  modules: ModuleRow[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const titleById = useMemo(() => {
    const m = new Map<string, string>();
    for (const mod of modules) m.set(mod.id, mod.title);
    return m;
  }, [modules]);

  async function markViewed(itemId: string) {
    await fetch(`/api/lms/module-items/${itemId}/complete`, {
      method: 'POST',
    });
    startTransition(() => router.refresh());
  }

  if (modules.length === 0) {
    return (
      <div className="rounded-lg border border-rule/70 bg-surface px-5 py-10 text-center text-sm text-ink-muted">
        No modules released for this section yet.
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {modules.map((m) => {
        const isCollapsed = collapsed[m.id] ?? false;
        const prereqNames = (m.prerequisiteModuleIds ?? [])
          .map((id) => titleById.get(id))
          .filter(Boolean) as string[];
        const required = m.items.filter(
          (i) => !i.isHeader && i.completionRequirement,
        );
        const doneRequired = required.filter((i) => i.completed).length;
        const moduleComplete =
          !m.locked &&
          required.length > 0 &&
          doneRequired === required.length;

        return (
          <li
            key={m.id}
            className="overflow-hidden rounded-md border border-rule/80 bg-surface"
          >
            <div className="flex items-center gap-2 bg-muted/40 px-3 py-2.5">
              <button
                type="button"
                className="rounded p-0.5 text-ink-muted hover:text-ink"
                onClick={() =>
                  setCollapsed((prev) => ({ ...prev, [m.id]: !prev[m.id] }))
                }
                aria-label={isCollapsed ? 'Expand' : 'Collapse'}
              >
                {isCollapsed ? (
                  <ChevronRight className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-ink">
                  {m.title}
                </div>
                <div className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-ink-muted">
                  {prereqNames.length > 0 ? (
                    <span>Prerequisites: {prereqNames.join(', ')}</span>
                  ) : null}
                  {required.length > 0 ? (
                    <span>
                      Complete all items ({doneRequired}/{required.length})
                    </span>
                  ) : null}
                  {m.locked && m.lockReason ? (
                    <span className="text-ink-muted">{m.lockReason}</span>
                  ) : null}
                </div>
              </div>
              {m.locked ? (
                <Lock className="h-4 w-4 shrink-0 text-ink-faint" />
              ) : moduleComplete ? (
                <Check className="h-4 w-4 shrink-0 text-success" />
              ) : null}
            </div>

            {!isCollapsed ? (
              m.locked ? (
                <p className="px-4 py-3 text-sm text-ink-muted">
                  This module is locked
                  {m.lockReason ? ` — ${m.lockReason}` : ''}.
                </p>
              ) : (
                <ul className="divide-y divide-rule/50">
                  {m.items.map((item) => {
                    if (item.isHeader) {
                      return (
                        <li
                          key={item.id}
                          className="bg-muted/20 px-4 py-2 text-sm font-medium text-ink"
                        >
                          {item.title}
                        </li>
                      );
                    }
                    const href = itemHref(sectionId, item);
                    const hint = reqHint(item);
                    return (
                      <li
                        key={item.id}
                        className="flex items-center gap-2 px-3 py-2.5 text-sm"
                      >
                        <FileText className="h-4 w-4 shrink-0 text-ink-muted" />
                        <div className="min-w-0 flex-1">
                          {href ? (
                            <Link
                              href={href}
                              className="text-brand hover:underline"
                              onClick={() => {
                                if (
                                  item.completionRequirement?.type === 'view'
                                ) {
                                  void markViewed(item.id);
                                }
                              }}
                            >
                              {item.title}
                            </Link>
                          ) : (
                            <span className="text-ink">{item.title}</span>
                          )}
                          {hint ? (
                            <div
                              className={cn(
                                'text-xs',
                                item.completed
                                  ? 'text-success'
                                  : 'text-ink-muted',
                              )}
                            >
                              {hint}
                            </div>
                          ) : null}
                        </div>
                        {item.completed ? (
                          <Check className="h-4 w-4 shrink-0 text-success" />
                        ) : null}
                        {!item.completed &&
                        item.completionRequirement &&
                        !pending ? (
                          <button
                            type="button"
                            className="text-xs text-ink-muted underline-offset-2 hover:underline"
                            onClick={() => void markViewed(item.id)}
                          >
                            Mark done
                          </button>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              )
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
