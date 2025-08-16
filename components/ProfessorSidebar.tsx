"use client";
import { BarChart2, BookOpen, FileText, LogOut, TrendingUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { SignOutButton } from '@clerk/nextjs';
import * as React from 'react';

interface ProfessorSidebarProps {
  active?: string;
}

const ProfessorSidebar: React.FC<ProfessorSidebarProps> = ({ active }) => (
  <aside className="hidden md:flex sticky top-0 h-screen w-64 bg-white/5 border-r border-white/10 flex-col p-6">
    <div className="mb-8">
      <a href="/" className="text-lg font-bold text-white flex items-center gap-2 hover:underline">S-O-L</a>
      <div className="text-xs text-white/40">Professor Dashboard</div>
    </div>
    <nav className="flex flex-col gap-2">
      <a href="/dashboard/professor" className={`flex items-center gap-2 ${active === 'dashboard' ? 'bg-white/10 text-white font-bold' : 'text-white/90'} hover:bg-white/10 rounded px-3 py-2 font-medium`}><BarChart2 className="w-4 h-4" /> Dashboard</a>
      <a href="/dashboard/professor/sections" className={`flex items-center gap-2 ${active === 'sections' ? 'bg-white/10 text-white font-bold' : 'text-white/80'} hover:bg-white/10 rounded px-3 py-2`}><BookOpen className="w-4 h-4" /> My Sections</a>
      <a href="/dashboard/professor/quizzes" className={`flex items-center gap-2 ${active === 'quizzes' ? 'bg-white/10 text-white font-bold' : 'text-white/80'} hover:bg-white/10 rounded px-3 py-2`}><FileText className="w-4 h-4" /> My Quizzes</a>
      <a href="/dashboard/professor/quiz-results" className={`flex items-center gap-2 ${active === 'quiz-results' ? 'bg-white/10 text-white font-bold' : 'text-white/80'} hover:bg-white/10 rounded px-3 py-2`}><TrendingUp className="w-4 h-4" /> All Results</a>
      <SignOutButton redirectUrl="/">
        <button className="flex items-center gap-2 text-red-400 hover:bg-red-400/10 rounded px-3 py-2 mt-8 w-full text-left">
          <LogOut className="w-4 h-4" /> Logout
        </button>
      </SignOutButton>
    </nav>
    <div className="mt-auto pt-8 flex flex-col gap-2">
      <div>
        <Badge className="bg-blue-600/20 text-blue-400 border-blue-600">Professor</Badge>
      </div>
      <div className="text-xs text-white/30">&copy; {new Date().getFullYear()} S-O-L</div>
    </div>
  </aside>
);

export default ProfessorSidebar; 