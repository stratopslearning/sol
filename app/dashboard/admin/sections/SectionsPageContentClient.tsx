"use client";
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { SectionFormModal } from '@/components/admin/SectionFormModal';
import CopyEnrollmentButton from '@/components/CopyEnrollmentButton';

const ROWS_PER_PAGE = 15;

export default function SectionsPageContentClient({ allSections, allCourses }: { allSections: any[]; allCourses: any[] }) {
  const [filter, setFilter] = useState('');
  const [courseId, setCourseId] = useState<string>('ALL');
  const [page, setPage] = useState(1);

  const filteredSections = useMemo(() => {
    return allSections.filter(section => {
      const matchesSearch =
        section.name.toLowerCase().includes(filter.toLowerCase()) ||
        section.professorEnrollmentCode.toLowerCase().includes(filter.toLowerCase()) ||
        section.studentEnrollmentCode.toLowerCase().includes(filter.toLowerCase()) ||
        (section.course?.title?.toLowerCase() || '').includes(filter.toLowerCase());
      const matchesCourse = courseId === 'ALL' || section.courseId === courseId;
      return matchesSearch && matchesCourse;
    });
  }, [allSections, filter, courseId]);

  const totalPages = Math.max(1, Math.ceil(filteredSections.length / ROWS_PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const paginatedSections = useMemo(() => {
    const start = (currentPage - 1) * ROWS_PER_PAGE;
    return filteredSections.slice(start, start + ROWS_PER_PAGE);
  }, [filteredSections, currentPage]);

  // Reset to page 1 when filters change
  React.useEffect(() => {
    setPage(1);
  }, [filter, courseId]);

  return (
    <div className="min-h-screen w-screen bg-[#030303] flex">
      <main className="flex-1 flex flex-col py-10 px-4 md:px-8 overflow-x-hidden">
        <section className="w-full max-w-7xl mx-auto mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Sections</h1>
          <p className="text-white/60 text-lg">View and manage all sections across courses</p>
        </section>

        <Card className="w-full max-w-7xl mx-auto rounded-xl shadow-lg bg-white/10 border border-white/10">
          <CardHeader>
            <CardTitle className="text-lg text-white">All Sections</CardTitle>
            <div className="flex flex-col md:flex-row gap-4 mt-4">
              <div className="w-full md:w-48">
                <Select value={courseId} onValueChange={setCourseId}>
                  <SelectTrigger className="w-full border-white/20 bg-white dark:bg-[#18181b] text-black dark:text-white rounded-md px-3 py-2">
                    <SelectValue placeholder="All courses" />
                  </SelectTrigger>
                  <SelectContent className="border-white/20 bg-white dark:bg-[#18181b] text-black dark:text-white rounded-md">
                    <SelectItem value="ALL">All courses</SelectItem>
                    {allCourses.map(c => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1">
                <Input
                  type="text"
                  placeholder="Search by section, course, or code..."
                  value={filter}
                  onChange={e => setFilter(e.target.value)}
                  className="w-full bg-white/5 border-white/20 text-white"
                />
              </div>
              <div className="flex gap-2">
                <SectionFormModal mode="create" allCourses={allCourses} />
                <SectionFormModal mode="create" bulk allCourses={allCourses} />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/10">
                    <TableHead className="text-white/60 font-medium">Section name</TableHead>
                    <TableHead className="text-white/60 font-medium">Course</TableHead>
                    <TableHead className="text-white/60 font-medium">Professor code</TableHead>
                    <TableHead className="text-white/60 font-medium">Student code</TableHead>
                    <TableHead className="text-white/60 font-medium text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedSections.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-white/60 py-8">
                        No sections found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedSections.map(section => (
                      <TableRow key={section.id} className="border-white/10 hover:bg-white/5">
                        <TableCell className="font-medium text-white">{section.name}</TableCell>
                        <TableCell className="text-white/80">{section.course?.title || 'Unknown'}</TableCell>
                        <TableCell className="text-white/80">
                          <span className="font-mono text-sm bg-white/10 px-2 py-1 rounded mr-2">
                            {section.professorEnrollmentCode}
                          </span>
                          <CopyEnrollmentButton code={section.professorEnrollmentCode} />
                        </TableCell>
                        <TableCell className="text-white/80">
                          <span className="font-mono text-sm bg-white/10 px-2 py-1 rounded mr-2">
                            {section.studentEnrollmentCode}
                          </span>
                          <CopyEnrollmentButton code={section.studentEnrollmentCode} />
                        </TableCell>
                        <TableCell className="text-right">
                          <SectionFormModal mode="delete" section={section} />
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
                      className={currentPage <= 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
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
                        className="cursor-pointer"
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
                      className={currentPage >= totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
