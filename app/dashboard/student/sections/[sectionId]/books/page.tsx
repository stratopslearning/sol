import Link from 'next/link';
import { BookOpen } from '@/components/icons';

import { EmptyState } from '@/components/patterns/EmptyState';
import { SectionHubShell } from '@/components/student/SectionHubShell';
import { requireStudent } from '@/lib/auth';
import { listStudentBooks } from '@/lib/books';
import { requireStudentSectionAccess } from '@/lib/student/sectionAccess';

export default async function StudentSectionBooksPage({
  params,
}: {
  params: Promise<{ sectionId: string }>;
}) {
  const user = await requireStudent();
  const { sectionId } = await params;
  const ctx = await requireStudentSectionAccess(user.id, sectionId);
  const books = await listStudentBooks(user.id, { sectionId });

  return (
    <SectionHubShell
      sectionId={ctx.sectionId}
      sectionName={ctx.sectionName}
      courseTitle={ctx.courseTitle}
      description="Released books for this section. Open a book to read chapters and sub-chapters."
      activeTab="books"
      user={user}
    >
      {books.length === 0 ? (
        <EmptyState
          icon={<BookOpen className="h-5 w-5" />}
          eyebrow="Books"
          title="No books yet."
          description="When your instructor releases a book to this section, it will show up here."
        />
      ) : (
        <ul className="divide-y divide-border rounded-2xl border border-border bg-card/40">
          {books.map((b) => (
            <li key={b.id}>
              <Link
                href={b.href}
                className="flex items-start gap-3 px-4 py-3.5 transition-colors hover:bg-muted/40"
              >
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border text-muted-foreground">
                  <BookOpen className="h-4 w-4" aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="font-medium text-foreground">{b.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {b.chapterCount} chapter
                    {b.chapterCount === 1 ? '' : 's'}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </SectionHubShell>
  );
}
