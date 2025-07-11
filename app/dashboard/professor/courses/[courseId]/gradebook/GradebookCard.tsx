"use client";
import * as React from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { FileText, Download } from "lucide-react";
import { toast } from "sonner";

interface Student {
  id: string;
  firstName?: string;
  lastName?: string;
  email: string;
}
interface Quiz {
  id: string;
  title: string;
}
interface Attempt {
  id: string;
  studentId: string;
  quizId: string;
  score: number;
  maxScore: number;
}
interface Course {
  id: string;
  title: string;
}

interface GradebookCardProps {
  course: Course;
  students: Student[];
  quizzes: Quiz[];
  attempts: Attempt[];
}

function getAttempt(
  attempts: Attempt[],
  studentId: string,
  quizId: string
): Attempt | undefined {
  return attempts.find((a) => a.studentId === studentId && a.quizId === quizId);
}

function getScoreBadge(score: number, maxScore: number) {
  const pct = (score / maxScore) * 100;
  if (pct >= 80) return <Badge className="bg-green-600 text-white">{score}/{maxScore}</Badge>;
  if (pct >= 60) return <Badge className="bg-yellow-400 text-gray-900">{score}/{maxScore}</Badge>;
  return <Badge className="bg-red-600 text-white">{score}/{maxScore}</Badge>;
}

const GradebookCard: React.FC<GradebookCardProps> = ({ course, students, quizzes, attempts }) => {
  const [activeQuiz, setActiveQuiz] = React.useState(quizzes[0]?.id || "");

  // CSV Export
  function exportCSV() {
    const headers = ["Student Name", "Email", ...quizzes.map((q) => q.title)];
    const rows = students.map((student) => [
      `${student.firstName || ""} ${student.lastName || ""}`.trim(),
      student.email,
      ...quizzes.map((quiz) => {
        const attempt = getAttempt(attempts, student.id, quiz.id);
        return attempt ? `${attempt.score ?? 0}/${attempt.maxScore}` : "";
      }),
    ]);
    const csv = [headers, ...rows]
      .map((r) => r.map((cell) => `"${cell}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${course.title}-gradebook.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast(
      "Gradebook exported!",
      {
        description: `CSV for ${course.title} downloaded.`
      }
    );
  }

  // Responsive, clean, and dark mode compatible
  return (
    <div className="flex justify-center items-center min-h-[80vh] w-full">
      <Card className="w-full max-w-4xl mx-auto rounded-2xl shadow-2xl bg-white dark:bg-gray-900 border border-white/10">
        <CardHeader className="pb-2">
          <CardTitle className="text-2xl text-gray-900 dark:text-white">Gradebook</CardTitle>
          <CardDescription className="text-gray-500 dark:text-gray-300 mt-1">
            {course.title} &mdash; {students.length} student{students.length !== 1 && "s"}, {quizzes.length} quiz{quizzes.length !== 1 && "zes"}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {quizzes.length > 1 ? (
            <Tabs value={activeQuiz} onValueChange={setActiveQuiz} className="w-full">
              <TabsList className="flex w-full justify-start gap-2 px-4 pt-2 pb-4 bg-transparent">
                {quizzes.map((quiz) => (
                  <TabsTrigger key={quiz.id} value={quiz.id} className="flex items-center gap-2">
                    <FileText className="w-4 h-4" /> {quiz.title}
                  </TabsTrigger>
                ))}
              </TabsList>
              {quizzes.map((quiz) => (
                <TabsContent key={quiz.id} value={quiz.id} className="overflow-x-auto">
                  <div className="overflow-x-auto">
                    <div className="min-w-[400px]">
                      <div className="grid grid-cols-3 gap-2 px-4 py-2 border-b border-gray-200 dark:border-white/10 text-xs font-semibold text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 rounded-t-lg">
                        <div>Student</div>
                        <div>Email</div>
                        <div className="text-center">Score</div>
                      </div>
                      {students.map((student, idx) => {
                        const attempt = getAttempt(attempts, student.id, quiz.id);
                        return (
                          <div
                            key={student.id}
                            className={`grid grid-cols-3 gap-2 px-4 py-3 items-center text-sm transition-colors ${idx % 2 === 0 ? "bg-gray-50 dark:bg-gray-800/60" : "bg-white dark:bg-gray-900"} hover:bg-gray-100 dark:hover:bg-gray-800`}
                          >
                            <div className="font-medium text-gray-900 dark:text-white whitespace-nowrap">{`${student.firstName || ""} ${student.lastName || ""}`.trim()}</div>
                            <div className="text-gray-600 dark:text-gray-300 whitespace-nowrap">{student.email}</div>
                            <div className="flex justify-center">
                              {attempt ? getScoreBadge(attempt.score, attempt.maxScore) : <span className="text-gray-400">—</span>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          ) : (
            <div className="overflow-x-auto">
              <div className="min-w-[400px]">
                <div className="grid grid-cols-4 gap-2 px-4 py-2 border-b border-gray-200 dark:border-white/10 text-xs font-semibold text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 rounded-t-lg">
                  <div>Student</div>
                  <div>Email</div>
                  <div className="flex items-center gap-1"><FileText className="w-4 h-4 mr-1" /> Quiz</div>
                  <div className="text-center">Score</div>
                </div>
                {students.map((student, idx) => (
                  quizzes.map((quiz, qidx) => {
                    const attempt = getAttempt(attempts, student.id, quiz.id);
                    return (
                      <div
                        key={student.id + quiz.id}
                        className={`grid grid-cols-4 gap-2 px-4 py-3 items-center text-sm transition-colors ${idx % 2 === 0 ? "bg-gray-50 dark:bg-gray-800/60" : "bg-white dark:bg-gray-900"} hover:bg-gray-100 dark:hover:bg-gray-800`}
                      >
                        <div className="font-medium text-gray-900 dark:text-white whitespace-nowrap">{`${student.firstName || ""} ${student.lastName || ""}`.trim()}</div>
                        <div className="text-gray-600 dark:text-gray-300 whitespace-nowrap">{student.email}</div>
                        <div className="flex items-center gap-1"><FileText className="w-4 h-4 mr-1" /> {quiz.title}</div>
                        <div className="flex justify-center">
                          {attempt ? getScoreBadge(attempt.score, attempt.maxScore) : <span className="text-gray-400">—</span>}
                        </div>
                      </div>
                    );
                  })
                ))}
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-end px-6 py-4 border-t border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-gray-900 rounded-b-2xl">
          <Button variant="secondary" onClick={exportCSV} className="flex gap-2">
            <Download className="w-4 h-4" /> Export CSV
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default GradebookCard; 