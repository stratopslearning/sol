import { getOrCreateUser } from '@/lib/getOrCreateUser';
import { db } from '@/app/db';
import { sections, professorSections } from '@/app/db/schema';
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
  Plus,
  Trash2,
  Save,
  Eye
} from 'lucide-react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { SignOutButton } from '@clerk/nextjs';
import { QuizCreationForm } from '@/components/quiz/QuizCreationForm';

export default async function CreateQuizPage() {
  const user = await getOrCreateUser();
  if (!user || user.role !== 'PROFESSOR') return null;

  // Fetch professor's sections for the form
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

  // Transform the data to match the expected format for SectionMultiSelect
  const enrolledSections = professorSectionsList.map(ps => ({
    id: ps.section.id,
    title: `${ps.section.course.title} - ${ps.section.name}`,
    description: ps.section.course.description
  }));

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
          {/* Header */}
          <section className="w-full max-w-4xl mb-8">
            <div className="flex items-center gap-4 mb-4">
              <Button asChild variant="ghost" size="sm">
                <a href="/dashboard/professor/quizzes" className="flex items-center gap-2">
                  <ArrowLeft className="w-4 h-4" />
                  Back to Quizzes
                </a>
              </Button>
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Create New Quiz</h1>
              <p className="text-white/60 text-lg">Build engaging quizzes for your students</p>
            </div>
          </section>

          {/* Quiz Creation Form */}
          <section className="w-full max-w-4xl">
            <QuizCreationForm courses={enrolledSections} />
          </section>
        </main>
      </div>
    </SidebarProvider>
  );
} 