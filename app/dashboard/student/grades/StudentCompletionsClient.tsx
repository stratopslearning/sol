"use client";

import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/patterns/EmptyState";

type Row = {
  id: string;
  type: string;
  title: string;
  courseTitle: string | null;
  status: string;
  href: string;
};

export default function StudentCompletionsClient({ rows }: { rows: Row[] }) {
  if (rows.length === 0) {
    return (
      <EmptyState
        eyebrow="Completion"
        title="No lessons or discussions yet."
        description="When your instructor releases non-quiz work, completion shows up here."
      />
    );
  }

  return (
    <div>
      <h2 className="font-display text-xl text-ink mb-4">Completion</h2>
      <ul className="divide-y divide-rule rounded-xl border border-rule bg-surface">
        {rows.map((row) => (
          <li
            key={row.id}
            className="flex items-center justify-between gap-3 px-4 py-3"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="font-mono text-[0.65rem]">
                  {row.type}
                </Badge>
                <Link href={row.href} className="font-medium text-ink hover:underline truncate">
                  {row.title}
                </Link>
              </div>
              <p className="text-xs text-ink-faint mt-0.5">
                {row.courseTitle ?? "Course"}
              </p>
            </div>
            <span className="text-sm text-ink-muted shrink-0">
              {row.status === "COMPLETED"
                ? "Completed"
                : row.status === "IN_PROGRESS"
                  ? "In progress"
                  : "Not started"}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
