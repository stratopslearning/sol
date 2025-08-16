"use client";
import { Badge } from '@/components/ui/badge';
import { BookOpen, FileText, CheckCircle, LogOut, BarChart2 } from 'lucide-react';
import { SignOutButton } from '@clerk/nextjs';

export default function StudentSidebar({ user }: { user: any }) {
  return (
    <aside className="hidden md:flex sticky top-0 h-screen w-64 bg-white/5 border-r border-white/10 flex-col p-6">
      <div className="mb-8">
        <a href="/" className="text-lg font-bold text-white flex items-center gap-2 hover:underline">S-O-L</a>
        <div className="text-xs text-white/40">Student Dashboard</div>
      </div>
      <nav className="flex flex-col gap-2">
        <a href="/dashboard/student" className="flex items-center gap-2 text-white/90 hover:bg-white/10 rounded px-3 py-2 font-medium"><BarChart2 className="w-4 h-4" /> Dashboard</a>
        <a href="/dashboard/student/sections" className="flex items-center gap-2 text-white/80 hover:bg-white/10 rounded px-3 py-2"><BookOpen className="w-4 h-4" /> My Sections</a>

        <a href="/dashboard/student/quizzes" className="flex items-center gap-2 text-white/80 hover:bg-white/10 rounded px-3 py-2"><FileText className="w-4 h-4" /> My Quizzes</a>
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
  );
} 