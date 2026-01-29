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
import { Button } from '@/components/ui/button';
import React, { useMemo, useState } from 'react';
import CopyEnrollmentButton from '@/components/CopyEnrollmentButton';
import Link from 'next/link';
import { Layers } from 'lucide-react';

const ROWS_PER_PAGE = 10;

export default function ProfessorSectionsPageContentClient({
  sectionsList,
}: {
  sectionsList: any[];
}) {
  const [search, setSearch] = useState('');
  const [courseFilter, setCourseFilter] = useState<string>('ALL');
  const [page, setPage] = useState(1);

  const courses = useMemo(() => {
    const seen = new Set<string>();
    return sectionsList
      .map(s => s.course)
      .filter((c): c is NonNullable<typeof c> => c != null)
      .filter(c => {
        if (seen.has(c.id)) return false;
        seen.add(c.id);
        return true;
      });
  }, [sectionsList]);

  const filteredSections = useMemo(() => {
    return sectionsList.filter(section => {
      const matchesSearch =
        !search ||
        section.name.toLowerCase().includes(search.toLowerCase()) ||
        (section.course?.title?.toLowerCase() || '').includes(search.toLowerCase());
      const matchesCourse = courseFilter === 'ALL' || section.courseId === courseFilter;
      return matchesSearch && matchesCourse;
    });
  }, [sectionsList, search, courseFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredSections.length / ROWS_PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const paginatedSections = useMemo(() => {
    const start = (currentPage - 1) * ROWS_PER_PAGE;
    return filteredSections.slice(start, start + ROWS_PER_PAGE);
  }, [filteredSections, currentPage]);

  React.useEffect(() => {
    setPage(1);
  }, [search, courseFilter]);

  if (sectionsList.length === 0) {
    return (
      <Card className="w-full max-w-7xl mx-auto rounded-xl shadow-lg bg-white/10 border border-white/10 text-center py-12">
        <CardContent>
          <Layers className="w-16 h-16 mx-auto mb-4 text-white/40" />
          <h3 className="text-xl font-semibold text-white mb-2">No Sections Enrolled</h3>
          <p className="text-white/60 mb-4">You haven&apos;t enrolled in any sections yet.</p>
          <div className="text-white/40 text-sm">Contact an administrator to get enrolled in sections.</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-7xl mx-auto rounded-xl shadow-lg bg-white/10 border border-white/10">
      <CardHeader>
        <CardTitle className="text-lg text-white">My Sections</CardTitle>
        <div className="flex flex-col md:flex-row gap-4 mt-4">
          <div className="w-full md:w-48">
            <Select value={courseFilter} onValueChange={setCourseFilter}>
              <SelectTrigger className="w-full border-white/20 bg-white dark:bg-[#18181b] text-black dark:text-white rounded-md px-3 py-2">
                <SelectValue placeholder="All courses" />
              </SelectTrigger>
              <SelectContent className="border-white/20 bg-white dark:bg-[#18181b] text-black dark:text-white rounded-md">
                <SelectItem value="ALL">All courses</SelectItem>
                {courses.map(c => (
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
              placeholder="Search by section name or course..."
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
                <TableHead className="text-white/60 font-medium">Section name</TableHead>
                <TableHead className="text-white/60 font-medium">Course</TableHead>
                <TableHead className="text-white/60 font-medium">Professor code</TableHead>
                <TableHead className="text-white/60 font-medium">Student code</TableHead>
                <TableHead className="text-white/60 font-medium text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedSections.map(section => (
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
                    <div className="flex justify-end gap-2">
                      <Button asChild size="sm" variant="secondary" className="text-white border-white/20">
                        <Link href={`/dashboard/professor/sections/${section.id}/gradebook`}>
                          Gradebook
                        </Link>
                      </Button>
                      <Button asChild size="sm" variant="outline" className="text-white border-white/20">
                        <Link href={`/dashboard/professor/sections/${section.id}`}>Details</Link>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
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
  );
}
