import { getOrCreateUser } from '@/lib/getOrCreateUser';
import { db } from '@/app/db';
import { attempts, quizzes, questions } from '@/app/db/schema';
import { eq } from 'drizzle-orm';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  FileText, 
  LogOut, 
  BarChart2, 
  Users, 
  ArrowLeft,
  CheckCircle,
  XCircle,
  Clock,
  User
} from 'lucide-react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { SignOutButton } from '@clerk/nextjs';
import { notFound } from 'next/navigation';
import { GPTFeedbackDisplay } from '@/components/quiz/GPTFeedbackDisplay';
import { professorSections } from '@/app/db/schema';

export default async function AttemptDetailPage({ 
  params 
}: { 
  params: Promise<{ attemptId: string }> 
}) {
  const { attemptId } = await params;
  const user = await getOrCreateUser();
  
  if (!user || user.role !== 'PROFESSOR') return null;

  // Fetch attempt with student, quiz, and section (with course)
  const attempt = await db.query.attempts.findFirst({
    where: eq(attempts.id, attemptId),
    with: {
      student: true,
      quiz: {
        with: {
          questions: {
            orderBy: questions.order,
          },
        },
      },
      section: {
        with: {
          course: true,
        },
      },
    },
  });

  if (!attempt) {
    notFound();
  }

  // Get professor's enrolled section IDs
  const professorSectionsList = await db.query.professorSections.findMany({
    where: eq(professorSections.professorId, user.id),
  });
  const enrolledSectionIds = professorSectionsList.map(ps => ps.sectionId);

  // Access control: allow if professor is assigned to the section
  if (!enrolledSectionIds.includes(attempt.sectionId)) {
    notFound();
  }

  // Parse student answers and GPT feedback
  const studentAnswers = attempt.answers && typeof attempt.answers === 'string'
    ? JSON.parse(attempt.answers)
    : attempt.answers || {};
  const gptFeedback: Record<string, any> = attempt.gptFeedback || {};

  return (
    <SidebarProvider>
      <div className="min-h-screen w-screen bg-[#030303] flex">
        {/* Sidebar */}
        <aside className="hidden md:flex sticky top-0 h-screen w-64 bg-white/5 border-r border-white/10 flex-col p-6">
          <div className="mb-8">
            <a href="/" className="text-lg font-bold text-white flex items-center gap-2 hover:underline">S-O-L</a>
            <div className="text-xs text-white/40">Professor Dashboard</div>
          </div>
          <nav className="flex flex-col gap-2">
            <a href="/dashboard/professor" className="flex items-center gap-2 text-white/80 hover:bg-white/10 rounded px-3 py-2"><BarChart2 className="w-4 h-4" /> Dashboard</a>
            <SignOutButton redirectUrl="/">
              <button className="flex items-center gap-2 text-red-400 hover:bg-red-400/10 rounded px-3 py-2 mt-8 w-full text-left">
                <LogOut className="w-4 h-4" /> Logout
              </button>
            </SignOutButton>
          </nav>
          <div className="mt-auto pt-8 flex flex-col gap-2">
            <div>
              <Badge className="bg-blue-600/20 text-blue-400 border-blue-600">
                Professor
              </Badge>
            </div>
            <div className="text-xs text-white/30">&copy; {new Date().getFullYear()} S-O-L</div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col items-center py-10 px-2 md:px-8">
          {/* Header */}
          <section className="w-full max-w-6xl mb-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <div className="flex items-center gap-4 mb-2">
                  <Button asChild variant="ghost" size="sm">
                    <a href={`/dashboard/professor/quiz/${attempt.quiz.id}/results`}>
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Back to Results
                    </a>
                  </Button>
                </div>
                <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Student Attempt</h1>
                <p className="text-white/60 text-lg">Detailed view of student submission</p>
              </div>
            </div>
          </section>

          {/* Student Info */}
          <section className="w-full max-w-6xl mb-8">
            <Card className="rounded-xl shadow-lg bg-white/10 border border-white/10">
              <CardHeader>
                <CardTitle className="text-xl text-white flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Student Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div>
                    <div className="text-sm font-medium text-white/60 mb-1">Student Name</div>
                    <div className="text-lg font-bold text-white">
                      {attempt.student.firstName} {attempt.student.lastName}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-white/60 mb-1">Email</div>
                    <div className="text-white">{attempt.student.email}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-white/60 mb-1">Quiz</div>
                    <div className="text-white font-medium">{attempt.quiz.title}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-white/60 mb-1">Section</div>
                    <div className="text-white font-medium">{attempt.section.name} ({attempt.section.course.title})</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-white/60 mb-1">Submitted</div>
                    <div className="text-white">
                      {attempt.submittedAt ? new Date(attempt.submittedAt).toLocaleDateString() : 'N/A'}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Attempt Summary */}
          <section className="w-full max-w-6xl mb-8">
            <Card className="rounded-xl shadow-lg bg-white/10 border border-white/10">
              <CardHeader>
                <CardTitle className="text-xl text-white">Attempt Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {/* Removed percentage display */}
                  <div className="text-center">
                    <div className="text-3xl font-bold text-white mb-2">{attempt.score}/{attempt.maxScore}</div>
                    <div className="text-sm text-white/60">Points Earned</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Question Responses */}
          <section className="w-full max-w-6xl">
            <Card className="rounded-xl shadow-lg bg-white/10 border border-white/10">
              <CardHeader>
                <CardTitle className="text-xl text-white">Question Responses</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {attempt.quiz.questions.map((question, index) => {
                  const answerValue = studentAnswers[question.id];
                  let isCorrect = false;
                  if (question.type === 'SHORT_ANSWER') {
                    isCorrect = gptFeedback[question.id]?.score === question.points;
                  } else {
                    isCorrect = answerValue === question.correctAnswer;
                  }
                  return (
                    <Card key={question.id} className="bg-white/5 border border-white/10">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold text-white mb-2">
                              Question {index + 1}
                            </h3>
                            <p className="text-white/80 mb-4">{question.question}</p>
                            <div className="space-y-2">
                              <div className="text-sm font-medium text-white/60">Student's Answer:</div>
                              <div className="mb-2">
                                {answerValue === undefined || answerValue === null || answerValue === '' ? (
                                  <span className="italic text-gray-400">No answer provided</span>
                                ) : (
                                  <span className="text-white">{String(answerValue)}</span>
                                )}
                              </div>
                              {question.type === 'MULTIPLE_CHOICE' && Array.isArray(question.options) && (
                                <ul className="list-none pl-0">
                                  {question.options.map((opt: string) => (
                                    <li key={opt}>
                                      {opt}
                                    </li>
                                  ))}
                                </ul>
                              )}
                              {/* Add similar display for TRUE_FALSE or SHORT_ANSWER if needed */}
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <div className="text-white/60 text-xs">{question.points} points</div>
                          </div>
                        </div>
                        {/* GPT Feedback for short answer */}
                        {question.type === 'SHORT_ANSWER' && gptFeedback[question.id] && (
                          <GPTFeedbackDisplay
                            feedback={gptFeedback[question.id]}
                            questionText={question.question}
                            studentAnswer={answerValue || ''}
                            className="mt-2"
                          />
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </CardContent>
            </Card>
          </section>
        </main>
      </div>
    </SidebarProvider>
  );
} 