import { getOrCreateUser } from '@/lib/getOrCreateUser';
import { db } from '@/app/db';
import { sections, studentSections, quizzes, attempts, users, quizSections } from '@/app/db/schema';
import { eq, inArray } from 'drizzle-orm';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SidebarProvider } from '@/components/ui/sidebar';
import StudentSidebar from '@/components/StudentSidebar';
import { FileText, CheckCircle, Clock, BookOpen } from 'lucide-react';

export default async function StudentQuizzesPage() {
  const user = await getOrCreateUser();
  if (!user || user.role !== 'STUDENT') return null;

  // Fetch student's section enrollments
  const enrollments = await db.query.studentSections.findMany({
    where: eq(studentSections.studentId, user.id),
    with: {
      section: true
    }
  });

  // Get section IDs for filtering
  const sectionIds = enrollments.map(e => e.sectionId);

  // Fetch quizzes assigned to student's sections
  const quizAssignments = sectionIds.length > 0 ? await db.query.quizSections.findMany({
    where: inArray(quizSections.sectionId, sectionIds),
    with: {
      quiz: {
        with: {
          sectionAssignments: {
            with: {
              section: true
            }
          }
        }
      }
    }
  }) : [];

  // Deduplicate quizzes by ID to avoid duplicate keys
  const assignedQuizzes = quizAssignments
    .map(qa => qa.quiz)
    .filter((quiz, index, self) => 
      index === self.findIndex(q => q.id === quiz.id)
    );

  // Fetch all attempts for this student
  const allAttempts = await db.query.attempts.findMany({
    where: eq(attempts.studentId, user.id),
  });

  // Map attempts by quizId
  const attemptsByQuiz: Record<string, typeof allAttempts[0][]> = {};
  allAttempts.forEach(a => {
    if (!attemptsByQuiz[a.quizId]) attemptsByQuiz[a.quizId] = [];
    attemptsByQuiz[a.quizId].push(a);
  });

  return (
    <SidebarProvider>
      <div className="min-h-screen w-screen bg-[#030303] flex">
        {/* Sidebar */}
        <StudentSidebar user={user} />
        {/* Main Content */}
        <main className="flex-1 flex flex-col py-10 px-4 md:px-8 overflow-x-hidden">
          {/* Header */}
          <section className="w-full max-w-7xl mx-auto mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">My Quizzes</h1>
            <p className="text-white/60 text-lg">Take quizzes for your enrolled sections</p>
          </section>

          {/* Available Quizzes */}
          <section className="w-full max-w-7xl mx-auto">
            {assignedQuizzes.length === 0 ? (
              <Card className="rounded-xl shadow-lg bg-white/10 border border-white/10 text-center py-12">
                <CardContent>
                  <FileText className="w-16 h-16 mx-auto mb-4 text-white/40" />
                  <h3 className="text-xl font-semibold text-white mb-2">No Quizzes Available</h3>
                  <p className="text-white/60 mb-4">No quizzes have been assigned to your sections yet.</p>
                  <div className="text-white/40 text-sm">Check back later for new quizzes in your enrolled sections.</div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {assignedQuizzes.map(quiz => {
                  const attempts = attemptsByQuiz[quiz.id] || [];
                  const hasAttempted = attempts.length > 0;
                  const latestAttempt = attempts.length > 0 ? attempts[attempts.length - 1] : null;
                  
                  return (
                    <Card key={quiz.id} className="flex flex-col justify-between rounded-xl shadow-lg bg-white/10 border border-white/10 hover:shadow-2xl transition-shadow">
                      <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-lg text-white flex-1 truncate">{quiz.title}</CardTitle>
                        <Badge className="bg-blue-600/20 text-blue-400 border-blue-600 ml-2">
                          Quiz
                        </Badge>
                      </CardHeader>
                      <CardContent className="flex flex-col gap-2">
                        <div className="flex items-center gap-2 text-white/70 text-sm">
                          <BookOpen className="w-4 h-4" />
                          {quiz.sectionAssignments[0]?.section.name || 'Unknown Section'}
                        </div>
                        <div className="flex items-center gap-2 text-white/70 text-sm">
                          <CheckCircle className="w-4 h-4" />
                          {hasAttempted ? 'Attempted' : 'Not Attempted'}
                        </div>
                        {quiz.timeLimit && (
                          <div className="flex items-center gap-2 text-white/70 text-sm">
                            <Clock className="w-4 h-4" />
                            {quiz.timeLimit} minutes
                          </div>
                        )}
                        {latestAttempt && (
                          <div className="text-sm text-white/60">
                            Last attempt: {latestAttempt.percentage}%
                          </div>
                        )}
                      </CardContent>
                      <div className="flex-1" />
                      <div className="p-4 pt-0 flex gap-2">
                        {!hasAttempted && (
                          <Button asChild className="w-full">
                            <a href={`/quiz/${quiz.id}`}>Start Quiz</a>
                          </Button>
                        )}
                        {hasAttempted && latestAttempt && (
                          <Button asChild variant="secondary" className="w-full">
                            <a href={`/quiz/${quiz.id}/results?attemptId=${latestAttempt.id}`}>
                              Review
                            </a>
                          </Button>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </section>
        </main>
      </div>
    </SidebarProvider>
  );
} 