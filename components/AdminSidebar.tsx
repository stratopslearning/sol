"use client";
import { BookOpen, Layers, User, LogOut, FileText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { SignOutButton } from '@clerk/nextjs';
import * as React from 'react';

interface AdminSidebarProps {
  active?: string;
}

const AdminSidebar: React.FC<AdminSidebarProps> = ({ active }) => (
  <aside className="hidden md:flex sticky top-0 h-screen w-64 bg-white/5 border-r border-white/10 flex-col p-6">
    <div className="mb-8">
      <a href="/" className="text-lg font-bold text-white flex items-center gap-2 hover:underline">S-O-L</a>
      <div className="text-xs text-white/40">Admin Dashboard</div>
    </div>
    <nav className="flex flex-col gap-2">
      <a href="/dashboard/admin" className={`flex items-center gap-2 ${active === 'dashboard' ? 'bg-white/10 text-white font-bold' : 'text-white/90'} hover:bg-white/10 rounded px-3 py-2 font-medium`}><BookOpen className="w-4 h-4" /> Dashboard</a>
      <a href="/dashboard/admin/courses" className={`flex items-center gap-2 ${active === 'courses' ? 'bg-white/10 text-white font-bold' : 'text-white/80'} hover:bg-white/10 rounded px-3 py-2`}><BookOpen className="w-4 h-4" /> Courses</a>
      <a href="/dashboard/admin/sections" className={`flex items-center gap-2 ${active === 'sections' ? 'bg-white/10 text-white font-bold' : 'text-white/80'} hover:bg-white/10 rounded px-3 py-2`}><Layers className="w-4 h-4" /> Sections</a>
      <a href="/dashboard/admin/quizzes" className={`flex items-center gap-2 ${active === 'quizzes' ? 'bg-white/10 text-white font-bold' : 'text-white/80'} hover:bg-white/10 rounded px-3 py-2`}><FileText className="w-4 h-4" /> Quizzes</a>
      <a href="/dashboard/admin/users" className={`flex items-center gap-2 ${active === 'users' ? 'bg-white/10 text-white font-bold' : 'text-white/80'} hover:bg-white/10 rounded px-3 py-2`}><User className="w-4 h-4" /> Users</a>
      <SignOutButton redirectUrl="/">
        <button className="flex items-center gap-2 text-red-400 hover:bg-red-400/10 rounded px-3 py-2 mt-8 w-full text-left">
          <LogOut className="w-4 h-4" /> Logout
        </button>
      </SignOutButton>
    </nav>
    <div className="mt-auto pt-8 flex flex-col gap-2">
      <div>
        <Badge className="bg-purple-600/20 text-purple-400 border-purple-600">Admin</Badge>
      </div>
      <div className="text-xs text-white/30">&copy; {new Date().getFullYear()} S-O-L</div>
    </div>
  </aside>
);

export default AdminSidebar; 