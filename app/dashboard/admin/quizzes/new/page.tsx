import { db } from '@/app/db';
import { SidebarProvider } from '@/components/ui/sidebar';
import AdminSidebar from '@/components/AdminSidebar';
import { Toaster } from '@/components/ui/sonner';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { QuizCreationForm } from '@/components/quiz/QuizCreationForm';

export default async function AdminQuizNewPage() {
  const allSections = await db.query.sections.findMany({ with: { course: true } });
  const courseOptions = allSections.map(section => ({
    id: section.id,
    title: `${section.name} (${section.course?.title || 'Unknown'})`,
  }));

  return (
    <SidebarProvider>
      <Toaster />
      <div className="min-h-screen w-screen bg-[#030303] flex">
        <AdminSidebar active="quizzes" />
        <main className="flex-1 flex flex-col py-10 px-4 md:px-8 overflow-x-hidden">
          <section className="w-full max-w-4xl mx-auto mb-6">
            <Button variant="ghost" asChild className="text-white/80 hover:text-white hover:bg-white/10">
              <Link href="/dashboard/admin/quizzes">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Quizzes
              </Link>
            </Button>
          </section>
          <section className="w-full max-w-4xl mx-auto">
            <QuizCreationForm
              courses={courseOptions}
              apiEndpoint="/api/admin/quiz/create"
            />
          </section>
        </main>
      </div>
    </SidebarProvider>
  );
}
