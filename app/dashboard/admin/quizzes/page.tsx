import { db } from '@/app/db';
import { quizzes, sections, quizSections } from '@/app/db/schema';
import { SidebarProvider } from '@/components/ui/sidebar';
import AdminSidebar from '@/components/AdminSidebar';
import { Toaster } from '@/components/ui/sonner';
import AdminQuizzesPageClient from './AdminQuizzesPageClient';

export default async function AdminQuizzesPage() {
  const allSections = await db.query.sections.findMany({ with: { course: true } });
  const allQuizzes = await db.query.quizzes.findMany();
  const allQuizSections = await db.query.quizSections.findMany();

  return (
    <SidebarProvider>
      <Toaster />
      <div className="min-h-screen w-screen bg-[#030303] flex">
        <AdminSidebar active="quizzes" />
        <AdminQuizzesPageClient
          allSections={allSections}
          allQuizzes={allQuizzes}
          allQuizSections={allQuizSections}
        />
      </div>
    </SidebarProvider>
  );
} 