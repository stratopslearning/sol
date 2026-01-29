import { getOrCreateUser } from '@/lib/getOrCreateUser';
import { db } from '@/app/db';
import { professorSections } from '@/app/db/schema';
import { eq } from 'drizzle-orm';
import { SidebarProvider } from '@/components/ui/sidebar';
import ProfessorSidebar from '@/components/ProfessorSidebar';
import SectionsPageContentClient from './SectionsPageContentClient';

export default async function ProfessorSectionsPage() {
  const user = await getOrCreateUser();
  if (!user || user.role !== 'PROFESSOR') return null;

  const enrollments = await db.query.professorSections.findMany({
    where: eq(professorSections.professorId, user.id),
    with: {
      section: {
        with: {
          course: true
        }
      }
    }
  });

  const sectionsList = enrollments.map(e => e.section);

  return (
    <SidebarProvider>
      <div className="min-h-screen w-screen bg-[#030303] flex">
        <ProfessorSidebar active="sections" />
        <main className="flex-1 flex flex-col py-10 px-4 md:px-8 overflow-x-hidden">
          <section className="w-full max-w-7xl mx-auto mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">My Sections</h1>
            <p className="text-white/60 text-lg">View and manage your enrolled sections and enrollment codes</p>
          </section>
          <section className="w-full max-w-7xl mx-auto">
            <SectionsPageContentClient sectionsList={sectionsList} />
          </section>
        </main>
      </div>
    </SidebarProvider>
  );
}
