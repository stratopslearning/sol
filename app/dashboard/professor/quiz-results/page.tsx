import { getOrCreateUser } from '@/lib/getOrCreateUser';
import { db } from '@/app/db';
import { quizzes, quizSections, professorSections, sections, courses } from '@/app/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  FileText, 
  LogOut, 
  BarChart2, 
  Users, 
  ArrowLeft,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  Calendar,
  Target,
  Search
} from 'lucide-react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { SignOutButton } from '@clerk/nextjs';

export default async function QuizResultsPage() {
  const user = await getOrCreateUser();
  
  if (!user || user.role !== 'PROFESSOR') return null;

  // Get professor's enrolled sections
  const professorSectionsList = await db.query.professorSections.findMany({
    where: eq(professorSections.professorId, user.id),
    with: {
      section: {
        with: {
          course: true
        }
      }
    }
  });

  const enrolledSectionIds = professorSectionsList.map(ps => ps.section.id);

  if (enrolledSectionIds.length === 0) {
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
              <a href="/dashboard/professor/quizzes" className="flex items-center gap-2 text-white/80 hover:bg-white/10 rounded px-3 py-2"><FileText className="w-4 h-4" /> My Quizzes</a>
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
            <section className="w-full max-w-4xl">
              <div className="text-center py-12">
                <FileText className="w-12 h-12 mx-auto mb-4 text-white/40" />
                <h3 className="text-lg font-medium text-white mb-2">No sections available</h3>
                <p className="text-white/60 mb-6">You need to be enrolled in at least one section to view quiz results.</p>
                <Button asChild>
                  <a href="/dashboard/professor/sections">
                    Join a Section
                  </a>
                </Button>
              </div>
            </section>
          </main>
        </div>
      </SidebarProvider>
    );
  }

  // Get all quizzes assigned to professor's enrolled sections
  const quizAssignments = await db.query.quizSections.findMany({
    where: inArray(quizSections.sectionId, enrolledSectionIds),
    with: {
      quiz: {
        with: {
          professor: true,
          questions: true,
          attempts: {
            with: {
              student: true,
              section: {
                with: {
                  course: true
                }
              }
            }
          }
        }
      },
      section: {
        with: {
          course: true
        }
      }
    },
    orderBy: (quizSections, { desc }) => desc(quizSections.assignedAt),
  });

  // Calculate statistics for each quiz
  const quizStats = quizAssignments.map(qa => {
    const quiz = qa.quiz;
    // Only include attempts for this section
    const attempts = quiz.attempts.filter(a => a.sectionId === qa.section.id);

    const totalAttempts = attempts.length;
    const uniqueStudents = new Set(attempts.map(a => a.studentId)).size;
    const averageScore = totalAttempts > 0 
      ? Math.round(attempts.reduce((sum, a) => sum + (a.percentage || 0), 0) / totalAttempts)
      : 0;
    const passRate = totalAttempts > 0 ? Math.round((attempts.filter(a => a.passed).length / totalAttempts) * 100) : 0;

    return {
      quizAssignment: qa,
      quiz,
      section: qa.section,
      totalAttempts,
      uniqueStudents,
      averageScore,
      passRate,
      lastAttempt: attempts.length > 0 ? new Date(Math.max(...attempts.map(a => new Date(a.submittedAt || 0).getTime()))) : null
    };
  });

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
            <a href="/dashboard/professor/quizzes" className="flex items-center gap-2 text-white/80 hover:bg-white/10 rounded px-3 py-2"><FileText className="w-4 h-4" /> My Quizzes</a>
            <a href="/dashboard/professor/quiz-results" className="flex items-center gap-2 text-white hover:bg-white/10 rounded px-3 py-2"><BarChart2 className="w-4 h-4" /> All Results</a>
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
                    <a href="/dashboard/professor">
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Back to Dashboard
                    </a>
                  </Button>
                </div>
                <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">All Quiz Results</h1>
                <p className="text-white/60 text-lg">View results for all quizzes in your enrolled sections</p>
              </div>
            </div>
          </section>

          {/* Quiz Results Table */}
          <section className="w-full max-w-6xl">
            <Card className="rounded-xl shadow-lg bg-white/10 border border-white/10 hover:shadow-2xl transition-shadow">
              <CardHeader>
                <CardTitle className="text-xl text-white">Quiz Results Overview</CardTitle>
              </CardHeader>
              <CardContent>
                {quizStats.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="w-12 h-12 mx-auto mb-4 text-white/40" />
                    <h3 className="text-lg font-medium text-white mb-2">No quiz results found</h3>
                    <p className="text-white/60">No quizzes have been assigned to your enrolled sections yet</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-white/10">
                          <TableHead className="text-white/60 font-medium">Quiz</TableHead>
                          <TableHead className="text-white/60 font-medium">Section</TableHead>
                          <TableHead className="text-white/60 font-medium">Created By</TableHead>
                          <TableHead className="text-white/60 font-medium">Attempts</TableHead>
                          <TableHead className="text-white/60 font-medium">Avg Score</TableHead>
                          <TableHead className="text-white/60 font-medium">Pass Rate</TableHead>
                          <TableHead className="text-white/60 font-medium">Last Attempt</TableHead>
                          <TableHead className="text-white/60 font-medium">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {quizStats.map((stat) => (
                          <TableRow key={`${stat.quiz.id}-${stat.section.id}`} className="border-white/10 hover:bg-white/5">
                            <TableCell className="font-medium text-white">
                              <div>
                                <div className="font-semibold">{stat.quiz.title}</div>
                                <div className="text-xs text-white/60">
                                  {stat.quiz.description || 'No description'}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-white/80">
                              <div>
                                <div className="font-medium">{stat.section.name}</div>
                                <div className="text-xs text-white/60">
                                  {stat.section.course.title}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-white/80">
                              <div>
                                <div className="font-medium">
                                  {stat.quiz.professor.firstName} {stat.quiz.professor.lastName}
                                </div>
                                <div className="text-xs text-white/60">
                                  {stat.quiz.professor.email}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-white/80">
                              <div className="flex items-center gap-2">
                                <div className="text-lg font-bold">{stat.totalAttempts}</div>
                                <div className="text-xs text-white/40">
                                  ({stat.uniqueStudents} students)
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-white/80">
                              <div className="text-lg font-bold">{stat.averageScore}%</div>
                            </TableCell>
                            <TableCell className="text-white/80">
                              <div className="flex items-center gap-2">
                                <div className="text-lg font-bold">{stat.passRate}%</div>
                                <Badge className={stat.passRate >= 70 ? "bg-green-600/20 text-green-400 border-green-600" : stat.passRate >= 50 ? "bg-yellow-600/20 text-yellow-400 border-yellow-600" : "bg-red-600/20 text-red-400 border-red-600"}>
                                  {stat.passRate >= 70 ? 'Good' : stat.passRate >= 50 ? 'Fair' : 'Poor'}
                                </Badge>
                              </div>
                            </TableCell>
                            <TableCell className="text-white/60 text-sm">
                              {stat.lastAttempt ? stat.lastAttempt.toLocaleDateString() : 'No attempts'}
                            </TableCell>
                            <TableCell>
                              <Button asChild variant="ghost" size="sm">
                                <a href={`/dashboard/professor/quiz/${stat.quiz.id}/results`}>
                                  <Eye className="w-4 h-4" />
                                </a>
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </section>
        </main>
      </div>
    </SidebarProvider>
  );
} 