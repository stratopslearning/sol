import { db } from '@/app/db';
import { courses, sections, users } from '@/app/db/schema';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SidebarProvider } from '@/components/ui/sidebar';
import { notFound } from 'next/navigation';
import { Plus, BookOpen, Users as UsersIcon, Layers, LogOut, User } from 'lucide-react';
import Link from 'next/link';
import { CourseFormModal } from '@/components/admin/CourseFormModal';
import { Badge } from '@/components/ui/badge';
import { SignOutButton } from '@clerk/nextjs';
import AdminSidebar from '@/components/AdminSidebar';

export default async function AdminDashboardPage() {
  // Fetch all courses, sections, and users for analytics
  const allCourses = await db.query.courses.findMany();
  const allSections = await db.query.sections.findMany();
  const allUsers = await db.query.users.findMany();

  return (
    <SidebarProvider>
      <div className="min-h-screen w-screen bg-[#030303] flex">
        {/* Sidebar */}
        <AdminSidebar active="dashboard" />
        {/* Main Content */}
        <main className="flex-1 flex flex-col py-10 px-4 md:px-8 overflow-x-hidden">
          {/* Header */}
          <section className="w-full max-w-7xl mx-auto mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Welcome back, Admin!</h1>
            <p className="text-white/60 text-lg">Here's your platform overview</p>
          </section>

          {/* Analytics Section */}
          <section className="w-full max-w-7xl mx-auto mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">Analytics Overview</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              <Card className="rounded-xl shadow-lg bg-white/10 border border-white/10 hover:shadow-2xl transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-white/60">Total Courses</CardTitle>
                  <BookOpen className="h-4 w-4 text-blue-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-400">{allCourses.length}</div>
                  <p className="text-xs text-white/40">Courses</p>
                </CardContent>
              </Card>
              <Card className="rounded-xl shadow-lg bg-white/10 border border-white/10 hover:shadow-2xl transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-white/60">Total Sections</CardTitle>
                  <Layers className="h-4 w-4 text-green-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-400">{allSections.length}</div>
                  <p className="text-xs text-white/40">Sections</p>
                </CardContent>
              </Card>
              <Card className="rounded-xl shadow-lg bg-white/10 border border-white/10 hover:shadow-2xl transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-white/60">Total Users</CardTitle>
                  <UsersIcon className="h-4 w-4 text-purple-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-purple-400">{allUsers.length}</div>
                  <p className="text-xs text-white/40">Users</p>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* Quick Actions */}
          <section className="w-full max-w-7xl mx-auto mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Course Creation */}
              <Card className="rounded-xl shadow-lg bg-white/10 border border-white/10 hover:shadow-2xl transition-shadow">
                <CardHeader>
                  <CardTitle className="text-lg text-white flex items-center gap-2">
                    <BookOpen className="w-5 h-5" />
                    Course Management
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CourseFormModal mode="create" />
                </CardContent>
              </Card>
              {/* Add more quick actions here if needed */}
            </div>
          </section>

          {/* Courses List */}
          <section className="w-full max-w-7xl mx-auto">
            <h2 className="text-xl font-semibold text-white mb-4">All Courses</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {allCourses.map(course => {
                const safeCourse = {
                  ...course,
                  description: course.description ?? undefined,
                };
                return (
                  <Card key={course.id} className="rounded-xl shadow-lg bg-white/10 border border-white/10 hover:shadow-2xl transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between">
                      <CardTitle className="text-lg text-white">{course.title}</CardTitle>
                      <Link href={`/dashboard/admin/courses/${course.id}`}
                        className="ml-2 text-blue-400 hover:underline flex items-center">
                        <BookOpen className="w-4 h-4" />
                      </Link>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-col gap-2">
                        <span className="text-white/60 text-sm">{course.description}</span>
                        <div className="flex gap-2 mt-4">
                          <CourseFormModal mode="edit" course={safeCourse} />
                          <CourseFormModal mode="delete" course={safeCourse} />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>
        </main>
      </div>
    </SidebarProvider>
  );
} 