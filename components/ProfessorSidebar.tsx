"use client";
import { BarChart2, BookOpen, FileText, LogOut, TrendingUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { SignOutButton } from '@clerk/nextjs';
import * as React from 'react';
import { 
  Sidebar, 
  SidebarContent, 
  SidebarHeader, 
  SidebarMenu, 
  SidebarMenuButton, 
  SidebarMenuItem, 
  SidebarFooter 
} from '@/components/ui/sidebar';

interface ProfessorSidebarProps {
  active?: string;
}

const ProfessorSidebar: React.FC<ProfessorSidebarProps> = ({ active }) => (
  <Sidebar>
    <SidebarContent>
      <SidebarHeader>
        <div className="mb-8">
          <a href="/" className="text-lg font-bold text-white flex items-center gap-2 hover:underline">S-O-L</a>
          <div className="text-xs text-white/40">Professor Dashboard</div>
        </div>
      </SidebarHeader>
      
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton asChild isActive={active === 'dashboard'}>
            <a href="/dashboard/professor">
              <BarChart2 className="w-4 h-4" />
              <span>Dashboard</span>
            </a>
          </SidebarMenuButton>
        </SidebarMenuItem>
        
        <SidebarMenuItem>
          <SidebarMenuButton asChild isActive={active === 'sections'}>
            <a href="/dashboard/professor/sections">
              <BookOpen className="w-4 h-4" />
              <span>My Sections</span>
            </a>
          </SidebarMenuButton>
        </SidebarMenuItem>
        
        <SidebarMenuItem>
          <SidebarMenuButton asChild isActive={active === 'quizzes'}>
            <a href="/dashboard/professor/quizzes">
              <FileText className="w-4 h-4" />
              <span>My Quizzes</span>
            </a>
          </SidebarMenuButton>
        </SidebarMenuItem>
        
        <SidebarMenuItem>
          <SidebarMenuButton asChild isActive={active === 'quiz-results'}>
            <a href="/dashboard/professor/quiz-results">
              <TrendingUp className="w-4 h-4" />
              <span>All Results</span>
            </a>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>

      <SidebarFooter>
        <div className="mt-auto pt-8 flex flex-col gap-2">
          <SignOutButton redirectUrl="/">
            <button className="flex items-center gap-2 text-red-400 hover:bg-red-400/10 rounded px-3 py-2 mt-8 w-full text-left">
              <LogOut className="w-4 h-4" /> Logout
            </button>
          </SignOutButton>
          
          <div>
            <Badge className="bg-blue-600/20 text-blue-400 border-blue-600">Professor</Badge>
          </div>
          <div className="text-xs text-white/30">&copy; {new Date().getFullYear()} S-O-L</div>
        </div>
      </SidebarFooter>
    </SidebarContent>
  </Sidebar>
);

export default ProfessorSidebar; 