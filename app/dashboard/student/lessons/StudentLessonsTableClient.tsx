'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { BookOpen } from '@/components/icons';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { EmptyState } from '@/components/patterns/EmptyState';
import { appPath } from '@/lib/basePath';
import type { StudentLessonListItem } from '@/lib/learning';

export default function StudentLessonsTableClient({
  lessons,
}: {
  lessons: StudentLessonListItem[];
}) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return lessons;
    return lessons.filter(
      (l) =>
        l.title.toLowerCase().includes(q) ||
        l.courseTitle.toLowerCase().includes(q),
    );
  }, [lessons, search]);

  if (lessons.length === 0) {
    return (
      <EmptyState
        icon={<BookOpen className="h-5 w-5" />}
        eyebrow="Nothing assigned"
        title="No lessons yet."
        description="When your professor releases a lesson, it will appear here."
      />
    );
  }

  return (
    <div className="space-y-4">
      <Input
        placeholder="Search lessons"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm"
      />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Lesson</TableHead>
            <TableHead>Course</TableHead>
            <TableHead>Sections</TableHead>
            <TableHead>Cards</TableHead>
            <TableHead>Status</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((lesson) => (
            <TableRow key={lesson.id}>
              <TableCell className="font-medium">{lesson.title}</TableCell>
              <TableCell className="text-muted-foreground">
                {lesson.courseTitle}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {lesson.sectionNames.join(', ') || '-'}
              </TableCell>
              <TableCell>{lesson.flashcardCount}</TableCell>
              <TableCell>
                <Badge variant="outline" className="font-normal">
                  {lesson.progressStatus === 'COMPLETED'
                    ? 'Completed'
                    : lesson.progressStatus === 'STARTED'
                      ? 'In progress'
                      : 'Open'}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <Button asChild size="sm" variant="outline">
                  <Link href={appPath(`/dashboard/student/lessons/${lesson.id}`)}>
                    Open
                  </Link>
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
