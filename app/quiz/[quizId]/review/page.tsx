import { redirect } from 'next/navigation';
import { getOrCreateUser } from '@/lib/getOrCreateUser';
import { db } from '@/app/db';
import { attempts, quizzes } from '@/app/db/schema';
import { eq } from 'drizzle-orm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, FileText, LogOut, BarChart2 } from 'lucide-react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { SignOutButton } from '@clerk/nextjs';
import { questions } from '@/app/db/schema';
import { GPTFeedbackDisplay } from '@/components/quiz/GPTFeedbackDisplay';

interface ReviewPageProps {
  params: Promise<{ quizId: string }>;
  searchParams: Promise<{ attemptId?: string }>;
}

export default async function ReviewPage({ params, searchParams }: ReviewPageProps) {
  const p = await params;
  const sp = await searchParams;
  const attemptId = sp.attemptId;
  const quizId = p.quizId;
  const user = await getOrCreateUser();
  if (!user) redirect('/login');

  if (!attemptId) {
    redirect('/dashboard/student');
  }

  // Fetch the attempt
  const attempt = await db.query.attempts.findFirst({
    where: eq(attempts.id, attemptId),
    with: {
      quiz: true,
    },
  });

  if (!attempt || attempt.studentId !== user.id) {
    redirect('/dashboard/student');
  }

  const quiz = attempt.quiz;
  // Fetch questions for this quiz
  const quizQuestions = await db.query.questions.findMany({
    where: eq(questions.quizId, quizId),
    orderBy: (questions, { asc }) => asc(questions.order),
  });
  const answers: Record<string, any> = attempt.answers || {};
  const gptFeedback: Record<string, any> = attempt.gptFeedback || {};

  return (
    <SidebarProvider>
      <div className="min-h-screen w-screen bg-[#030303] flex">
        {/* Sidebar */}
        <aside className="hidden md:flex sticky top-0 h-screen w-64 bg-white/5 border-r border-white/10 flex-col p-6">
          <div className="mb-8">
            <div className="text-lg font-bold text-white flex items-center gap-2"><FileText className="w-5 h-5" /> S-O-L</div>
            <div className="text-xs text-white/40">Student Dashboard</div>
          </div>
          <nav className="flex flex-col gap-2">
            <a href="/dashboard/student" className="flex items-center gap-2 text-white/90 hover:bg-white/10 rounded px-3 py-2 font-medium"><BarChart2 className="w-4 h-4" /> Dashboard</a>
            <a href="/dashboard/student/grades" className="flex items-center gap-2 text-white/80 hover:bg-white/10 rounded px-3 py-2"><CheckCircle className="w-4 h-4" /> My Grades</a>
            <SignOutButton redirectUrl="/">
              <button className="flex items-center gap-2 text-red-400 hover:bg-red-400/10 rounded px-3 py-2 mt-8 w-full text-left">
                <LogOut className="w-4 h-4" /> Logout
              </button>
            </SignOutButton>
          </nav>
          <div className="mt-auto pt-8 flex flex-col gap-2">
            <div>
              <Badge className={user.paid ? 'bg-green-600/20 text-green-400 border-green-600' : 'bg-red-600/20 text-red-400 border-red-600'}>
                {user.paid ? 'Paid' : 'Unpaid'}
              </Badge>
            </div>
            <div className="text-xs text-white/30">&copy; {new Date().getFullYear()} S-O-L</div>
          </div>
        </aside>
        {/* Main Content */}
        <main className="flex-1 flex flex-col items-center py-10 px-2 md:px-8 bg-gradient-to-br from-[#18181b] to-[#030303] min-h-screen">
          <Card className="max-w-2xl mx-auto w-full shadow-2xl border-2 border-white/10 bg-[#18181b]/90">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl text-white">Review Answers</CardTitle>
              <p className="text-gray-300 mt-2 font-medium">{quiz.title}</p>
            </CardHeader>
            <CardContent className="space-y-8">
              {quizQuestions.map((q, idx) => (
                <div key={q.id} className="space-y-4">
                  <div className="bg-white/10 border border-white/10 rounded-xl p-6 shadow-md">
                    <div className="font-semibold text-lg text-white mb-2">Q{idx + 1}: {q.question}</div>
                    <div className="mb-2">
                      <span className="text-gray-300 font-medium">Your Answer: </span>
                      <span className="text-white">{answers[q.id] ?? <span className="italic text-gray-400">No answer</span>}</span>
                    </div>
                    <div className="mb-2">
                      <span className="text-gray-300 font-medium">Correct Answer: </span>
                      <span className="text-green-400">{q.correctAnswer ?? <span className="italic text-gray-400">N/A</span>}</span>
                    </div>
                  </div>
                  {/* Enhanced GPT Feedback Display */}
                  {q.type === 'SHORT_ANSWER' && gptFeedback[q.id] && (
                    <GPTFeedbackDisplay
                      feedback={gptFeedback[q.id]}
                      questionText={q.question}
                      studentAnswer={answers[q.id] || ''}
                      className="mt-2"
                    />
                  )}
                  {/* Simple feedback for MCQ/TF questions */}
                  {q.type !== 'SHORT_ANSWER' && gptFeedback[q.id]?.feedback && (
                    <div className="bg-blue-900/30 border border-blue-500/30 rounded-xl p-6 shadow-md">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-semibold text-blue-300">Question Result</span>
                        <Badge variant="outline" className="text-xs">
                          {gptFeedback[q.id].score}/{gptFeedback[q.id].maxPoints} pts
                        </Badge>
                      </div>
                      <p className="text-base text-blue-100 font-medium">
                        {answers[q.id] === q.correctAnswer ? 
                          'Correct! Well done.' : 
                          'Incorrect. Review the correct answer above.'
                        }
                      </p>
                    </div>
                  )}
                </div>
              ))}
              <div className="flex space-x-4 pt-6">
                <Button asChild className="flex-1 text-lg font-semibold py-3">
                  <a href={`/quiz/${quizId}/results?attemptId=${attemptId}`}>Back to Results</a>
                </Button>
                <Button asChild variant="outline" className="flex-1 text-lg font-semibold py-3">
                  <a href="/dashboard/student">Back to Dashboard</a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </SidebarProvider>
  );
} 