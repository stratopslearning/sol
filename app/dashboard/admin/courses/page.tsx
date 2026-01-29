import { db } from '@/app/db';
import { courses, sections } from '@/app/db/schema';
import { SidebarProvider } from '@/components/ui/sidebar';
import AdminSidebar from '@/components/AdminSidebar';
import { CourseFormModal } from '@/components/admin/CourseFormModal';
import { Toaster } from '@/components/ui/sonner';
import AdminCoursesPageContentClient from './AdminCoursesPageContentClient';

export default async function AdminCoursesPage() {
  const allCourses = await db.query.courses.findMany();
  const allSections = await db.query.sections.findMany();
  const sectionCountByCourse: Record<string, number> = {};
  for (const section of allSections) {
    sectionCountByCourse[section.courseId] = (sectionCountByCourse[section.courseId] || 0) + 1;
  }

  const coursesWithCount = allCourses.map(c => ({
    id: c.id,
    title: c.title,
    description: c.description,
    sectionCount: sectionCountByCourse[c.id] || 0,
  }));

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
            <AdminCoursesPageContentClient courses={coursesWithCount} />
          </section>
        </main>
      </div>
    </SidebarProvider>
  );
}
