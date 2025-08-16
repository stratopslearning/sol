import { db } from '@/app/db';
import { SidebarProvider } from '@/components/ui/sidebar';
import SectionsPageContentClient from './SectionsPageContentClient';
import AdminSidebar from '@/components/AdminSidebar';
import { Toaster } from '@/components/ui/sonner';

export default async function AdminSectionsPage() {
  // Fetch all sections with their courses
  const allSections = await db.query.sections.findMany({
    with: { course: true }
  });
  // Fetch all courses for section creation
  const allCourses = await db.query.courses.findMany();

  return (
    <SidebarProvider>
      <Toaster />
      <div className="min-h-screen w-screen bg-[#030303] flex">
        <AdminSidebar active="sections" />
        <SectionsPageContentClient allSections={allSections} allCourses={allCourses} />
      </div>
    </SidebarProvider>
  );
} 