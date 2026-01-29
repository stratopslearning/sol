"use client";
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import React, { useMemo, useState } from 'react';
import { CourseFormModal } from '@/components/admin/CourseFormModal';
import { BookOpen } from 'lucide-react';

const ROWS_PER_PAGE = 15;

type CourseRow = {
  id: string;
  title: string;
  description: string | null;
  sectionCount: number;
};

export default function AdminCoursesPageContentClient({
  courses,
}: {
  courses: CourseRow[];
}) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const filteredCourses = useMemo(() => {
    if (!search.trim()) return courses;
    const q = search.toLowerCase();
    return courses.filter(
      c =>
        c.title.toLowerCase().includes(q) ||
        (c.description?.toLowerCase() || '').includes(q)
    );
  }, [courses, search]);

  const totalPages = Math.max(1, Math.ceil(filteredCourses.length / ROWS_PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const paginatedCourses = useMemo(() => {
    const start = (currentPage - 1) * ROWS_PER_PAGE;
    return filteredCourses.slice(start, start + ROWS_PER_PAGE);
  }, [filteredCourses, currentPage]);

  React.useEffect(() => {
    setPage(1);
  }, [search]);

  if (courses.length === 0) {
    return (
      <Card className="w-full max-w-7xl mx-auto rounded-xl shadow-lg bg-white/10 border border-white/10 text-center py-12">
        <CardContent>
          <BookOpen className="w-16 h-16 mx-auto mb-4 text-white/40" />
          <h3 className="text-xl font-semibold text-white mb-2">No Courses</h3>
          <p className="text-white/60 mb-4">Create your first course to get started.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-7xl mx-auto rounded-xl shadow-lg bg-white/10 border border-white/10">
      <CardHeader>
        <CardTitle className="text-lg text-white">All Courses</CardTitle>
        <div className="flex flex-col md:flex-row gap-4 mt-4">
          <div className="flex-1">
            <Input
              type="text"
              placeholder="Search by title or description..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-white/5 border-white/20 text-white"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-white/10">
                <TableHead className="text-white/60 font-medium">Title</TableHead>
                <TableHead className="text-white/60 font-medium">Description</TableHead>
                <TableHead className="text-white/60 font-medium">Sections</TableHead>
                <TableHead className="text-white/60 font-medium text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedCourses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-white/60 py-8">
                    No courses found.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedCourses.map(course => (
                  <TableRow key={course.id} className="border-white/10 hover:bg-white/5">
                    <TableCell className="font-medium text-white">{course.title}</TableCell>
                    <TableCell className="text-white/80 max-w-md truncate">
                      {course.description || '—'}
                    </TableCell>
                    <TableCell className="text-white/80">{course.sectionCount}</TableCell>
                    <TableCell className="text-right">
                      <CourseFormModal
                        mode="delete"
                        course={{ id: course.id, title: course.title, description: course.description ?? undefined }}
                      />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        {totalPages > 1 && (
          <Pagination className="mt-4">
            <PaginationContent className="gap-1">
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  onClick={e => {
                    e.preventDefault();
                    if (currentPage > 1) setPage(currentPage - 1);
                  }}
                  className={currentPage <= 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer text-white/90 hover:bg-white/15 hover:text-white'}
                />
              </PaginationItem>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <PaginationItem key={p}>
                  <PaginationLink
                    href="#"
                    onClick={e => {
                      e.preventDefault();
                      setPage(p);
                    }}
                    isActive={p === currentPage}
                    className={p === currentPage ? 'cursor-pointer border-white/30 bg-white/15 text-white' : 'cursor-pointer text-white/90 hover:bg-white/15 hover:text-white'}
                  >
                    {p}
                  </PaginationLink>
                </PaginationItem>
              ))}
              <PaginationItem>
                <PaginationNext
                  href="#"
                  onClick={e => {
                    e.preventDefault();
                    if (currentPage < totalPages) setPage(currentPage + 1);
                  }}
                  className={currentPage >= totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer text-white/90 hover:bg-white/15 hover:text-white'}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        )}
      </CardContent>
    </Card>
  );
}
