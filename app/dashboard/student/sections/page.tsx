import { getOrCreateUser } from '@/lib/getOrCreateUser';
import { db } from '@/app/db';
import { sections, studentSections, courses } from '@/app/db/schema';
import { eq } from 'drizzle-orm';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import StudentSidebar from '@/components/StudentSidebar';
import { BookOpen, Users, Calendar } from 'lucide-react';
import LeaveSectionButton from '@/components/LeaveSectionButton';
import StudentEnrollFormWrapper from '@/components/StudentEnrollFormWrapper';

export default async function StudentSectionsPage() {
  const user = await getOrCreateUser();
  if (!user || user.role !== 'STUDENT') return null;

  // Fetch student's section enrollments with course info
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
    <SidebarProvider>
      <div className="min-h-screen w-screen bg-[#030303] flex">
        {/* Sidebar */}
        <StudentSidebar user={user} />
        {/* Main Content */}
        <main className="flex-1 flex flex-col py-10 px-4 md:px-8 overflow-x-hidden">
          <StudentEnrollFormWrapper />
          
          {/* Header */}
          <section className="w-full max-w-7xl mx-auto mb-8">
            <div className="flex items-center justify-between mb-4">
              <div className="md:hidden">
                <SidebarTrigger />
              </div>
              <div className="flex-1" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">My Sections</h1>
            <p className="text-white/60 text-lg">View and manage your enrolled sections</p>
          </section>

          {/* Sections List */}
          <section className="w-full max-w-7xl mx-auto">
            {sectionsList.length === 0 ? (
              <Card className="rounded-xl shadow-lg bg-white/10 border border-white/10 text-center py-12">
                <CardContent>
                  <BookOpen className="w-16 h-16 mx-auto mb-4 text-white/40" />
                  <h3 className="text-xl font-semibold text-white mb-2">No Sections Enrolled</h3>
                  <p className="text-white/60 mb-4">You haven't enrolled in any sections yet.</p>
                  <div className="text-white/40 text-sm">Use the enrollment form above to join a section using the enrollment code from your professor.</div>
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
                        
                        <div className="flex items-center gap-2 text-white/60 text-sm">
                          <Calendar className="w-4 h-4" />
                          Enrolled: {new Date(enrollments.find(e => e.sectionId === section.id)?.enrolledAt || '').toLocaleDateString()}
                        </div>

                        {section.course?.description && (
                          <div className="text-sm text-white/60">
                            <strong>Course Description:</strong> {section.course.description}
                          </div>
                        )}

                        {/* Action Buttons */}
                        <div className="mt-4 flex flex-col gap-2">
                          <LeaveSectionButton 
                            sectionId={section.id} 
                            sectionName={section.name}
                          />
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