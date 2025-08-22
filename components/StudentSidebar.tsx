"use client";
import { BookOpen, FileText, CheckCircle, LogOut, BarChart2, Menu, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { SignOutButton } from '@clerk/nextjs';
import { useState } from 'react';

export default function StudentSidebar({ user }: { user: any }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <>
      {/* Desktop Sidebar */}
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

      {/* Mobile Menu Button */}
      <div className="md:hidden fixed top-4 left-4 z-50">
        <button
          onClick={toggleMobileMenu}
          className="bg-white/10 hover:bg-white/20 text-white p-2 rounded-lg border border-white/20"
        >
          <Menu className="w-6 h-6" />
        </button>
      </div>

      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-40">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/50"
            onClick={toggleMobileMenu}
          />
          
          {/* Sidebar */}
          <div className="absolute left-0 top-0 h-full w-64 bg-white/5 border-r border-white/10 p-6">
            <div className="flex items-center justify-between mb-8">
              <div>
                <a href="/" className="text-lg font-bold text-white flex items-center gap-2 hover:underline">S-O-L</a>
                <div className="text-xs text-white/40">Student Dashboard</div>
              </div>
              <button
                onClick={toggleMobileMenu}
                className="text-white/60 hover:text-white p-1"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <nav className="flex flex-col gap-2">
              <a 
                href="/dashboard/student" 
                className="flex items-center gap-2 text-white/90 hover:bg-white/10 rounded px-3 py-2 font-medium"
                onClick={toggleMobileMenu}
              >
                <BarChart2 className="w-4 h-4" /> Dashboard
              </a>
              
              <a 
                href="/dashboard/student/sections" 
                className="flex items-center gap-2 text-white/80 hover:bg-white/10 rounded px-3 py-2"
                onClick={toggleMobileMenu}
              >
                <BookOpen className="w-4 h-4" /> My Sections
              </a>

              <a 
                href="/dashboard/student/quizzes" 
                className="flex items-center gap-2 text-white/80 hover:bg-white/10 rounded px-3 py-2"
                onClick={toggleMobileMenu}
              >
                <FileText className="w-4 h-4" /> My Quizzes
              </a>
              
              <a 
                href="/dashboard/student/grades" 
                className="flex items-center gap-2 text-white/80 hover:bg-white/10 rounded px-3 py-2"
                onClick={toggleMobileMenu}
              >
                <CheckCircle className="w-4 h-4" /> My Grades
              </a>
            </nav>
            
            <div className="mt-auto pt-8 flex flex-col gap-2">
              <SignOutButton redirectUrl="/">
                <button className="flex items-center gap-2 text-red-400 hover:bg-red-400/10 rounded px-3 py-2 mt-8 w-full text-left">
                  <LogOut className="w-4 h-4" /> Logout
                </button>
              </SignOutButton>
              
              <div>
                <Badge className={user.paid ? 'bg-green-600/20 text-green-400 border-green-600' : 'bg-red-600/20 text-red-400 border-red-600'}>
                  {user.paid ? 'Paid' : 'Unpaid'}
                </Badge>
              </div>
              <div className="text-xs text-white/30">&copy; {new Date().getFullYear()} S-O-L</div>
            </div>
          </div>
        </div>
      )}
    </>
  );
} 