import { db } from '@/app/db';
import { courses, sections } from '@/app/db/schema';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { SidebarProvider } from '@/components/ui/sidebar';
import { BookOpen, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import AdminSidebar from '@/components/AdminSidebar';
import { CourseFormModal } from '@/components/admin/CourseFormModal';
import { Toaster } from '@/components/ui/sonner';

export default async function AdminCoursesPage() {
  const allCourses = await db.query.courses.findMany();
  const allSections = await db.query.sections.findMany();
  // Map courseId to section count
  const sectionCountByCourse: Record<string, number> = {};
  for (const section of allSections) {
    sectionCountByCourse[section.courseId] = (sectionCountByCourse[section.courseId] || 0) + 1;
  }

  return (
    <SidebarProvider>
      <Toaster />
      <div className="min-h-screen w-screen bg-[#030303] flex">
        <AdminSidebar active="courses" />
        <main className="flex-1 flex flex-col py-10 px-4 md:px-8 overflow-x-hidden">
          <section className="w-full max-w-7xl mx-auto mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Courses</h1>
            <p className="text-white/60 text-lg">View and manage all courses</p>
            <div className="mt-4">
              <CourseFormModal mode="create" />
            </div>
          </section>
          <section className="w-full max-w-7xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {allCourses.map(course => {
                const safeCourse = { ...course, description: course.description ?? undefined };
                const sectionCount = sectionCountByCourse[course.id] || 0;
                return (
                  <Card key={course.id} className="rounded-2xl shadow-xl bg-white/5 border border-white/10 hover:shadow-2xl transition-shadow flex flex-col justify-between min-h-[120px] p-0">
                    <CardHeader className="flex flex-row items-center justify-between gap-4 p-6 pb-2">
                      <div className="flex items-center gap-3">
                        <BookOpen className="w-6 h-6 text-blue-400" />
                        <CardTitle className="text-xl text-white font-semibold">{course.title}</CardTitle>
                      </div>
                      <div className="flex items-center">
                        <CourseFormModal mode="delete" course={safeCourse} />
                      </div>
                    </CardHeader>
                    <CardContent className="px-6 pb-6 pt-2">
                      <span className="text-white/70 text-base block min-h-[24px]">{course.description}</span>
                      <div className="mt-2 text-sm text-white/60">Sections: <span className="font-bold text-white">{sectionCount}</span></div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>
        </main>
      </div>
    </SidebarProvider>
  );
} 