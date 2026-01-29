import { getOrCreateUser } from '@/lib/getOrCreateUser';
import { db } from '@/app/db';
import { studentSections } from '@/app/db/schema';
import { eq } from 'drizzle-orm';
import StudentSidebar from '@/components/StudentSidebar';
import StudentEnrollFormWrapper from '@/components/StudentEnrollFormWrapper';
import StudentSectionsPageContentClient from './StudentSectionsPageContentClient';

export default async function StudentSectionsPage() {
  const user = await getOrCreateUser();
  if (!user || user.role !== 'STUDENT') return null;

  const enrollments = await db.query.studentSections.findMany({
    where: eq(studentSections.studentId, user.id),
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
    <div className="min-h-screen w-screen bg-[#030303] flex">
      <StudentSidebar user={user} />
      <main className="flex-1 flex flex-col py-10 px-4 md:px-8 overflow-x-hidden">
        <StudentEnrollFormWrapper />
        <section className="w-full max-w-7xl mx-auto mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">My Sections</h1>
          <p className="text-white/60 text-lg">View and manage your enrolled sections</p>
        </section>
        <section className="w-full max-w-7xl mx-auto">
          <StudentSectionsPageContentClient sectionsList={sectionsList} />
        </section>
      </main>
    </div>
  );
} 