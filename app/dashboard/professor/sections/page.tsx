import { getOrCreateUser } from '@/lib/getOrCreateUser';
import { db } from '@/app/db';
import { sections, professorSections, courses } from '@/app/db/schema';
import { eq } from 'drizzle-orm';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SidebarProvider } from '@/components/ui/sidebar';
import ProfessorSidebar from '@/components/ProfessorSidebar';
import { BookOpen, Users, Copy } from 'lucide-react';
import CopyEnrollmentButton from '@/components/CopyEnrollmentButton';
import { Button } from '@/components/ui/button';

export default async function ProfessorSectionsPage() {
  const user = await getOrCreateUser();
  if (!user || user.role !== 'PROFESSOR') return null;

  // Fetch professor's section enrollments with course info
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
        {/* Sidebar */}
        <ProfessorSidebar active="sections" />
        {/* Main Content */}
        <main className="flex-1 flex flex-col py-10 px-4 md:px-8 overflow-x-hidden">
          {/* Header */}
          <section className="w-full max-w-7xl mx-auto mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">My Sections</h1>
            <p className="text-white/60 text-lg">View and manage your enrolled sections and enrollment codes</p>
          </section>

          {/* Sections List */}
          <section className="w-full max-w-7xl mx-auto">
            {sectionsList.length === 0 ? (
              <Card className="rounded-xl shadow-lg bg-white/10 border border-white/10 text-center py-12">
                <CardContent>
                  <BookOpen className="w-16 h-16 mx-auto mb-4 text-white/40" />
                  <h3 className="text-xl font-semibold text-white mb-2">No Sections Enrolled</h3>
                  <p className="text-white/60 mb-4">You haven't enrolled in any sections yet.</p>
                  <div className="text-white/40 text-sm">Contact an administrator to get enrolled in sections.</div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {sectionsList.map(section => (
                  <Card key={section.id} className="rounded-xl shadow-lg bg-white/10 border border-white/10">
                    <CardHeader>
                      <CardTitle className="text-xl text-white flex items-center gap-2">
                        <BookOpen className="w-6 h-6" />
                        {section.name}
                      </CardTitle>
                      {section.course && (
                        <p className="text-white/60 text-sm">{section.course.title}</p>
                      )}
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <div className="text-sm font-medium text-white">Section ID: {section.id}</div>
                            <div className="text-xs text-white/60">{section.course ? `Course: ${section.course.title}` : ''}</div>
                          </div>
                          <Badge className="bg-green-600/20 text-green-400 border-green-600">
                            Enrolled
                          </Badge>
                        </div>
                        {/* Professor Enrollment Code */}
                        <div className="space-y-2">
                          <div className="text-white/80 text-sm">Professor Enrollment Code:</div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-base text-blue-400 bg-blue-900/20 px-2 py-1 rounded select-all">
                              {section.professorEnrollmentCode}
                            </span>
                            <CopyEnrollmentButton code={section.professorEnrollmentCode} />
                          </div>
                        </div>
                        {/* Student Enrollment Code */}
                        <div className="space-y-2 mt-3">
                          <div className="text-white/80 text-sm">Student Enrollment Code:</div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-base text-green-400 bg-green-900/20 px-2 py-1 rounded select-all">
                              {section.studentEnrollmentCode}
                            </span>
                            <CopyEnrollmentButton code={section.studentEnrollmentCode} />
                          </div>
                        </div>
                        {/* Gradebook Button */}
                        <div className="mt-4 flex flex-col gap-2">
                          <Button asChild variant="secondary" className="w-full">
                            <a href={`/dashboard/professor/sections/${section.id}/gradebook`}>
                              View Gradebook
                            </a>
                          </Button>
                          <Button asChild variant="outline" className="w-full">
                            <a href={`/dashboard/professor/sections/${section.id}`}>Section Details</a>
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </section>
        </main>
      </div>
    </SidebarProvider>
  );
} 