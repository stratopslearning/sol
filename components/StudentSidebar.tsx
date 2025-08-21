"use client";
import { Badge } from '@/components/ui/badge';
import { BookOpen, FileText, CheckCircle, LogOut, BarChart2 } from 'lucide-react';
import { SignOutButton } from '@clerk/nextjs';
import { 
  Sidebar, 
  SidebarContent, 
  SidebarHeader, 
  SidebarMenu, 
  SidebarMenuButton, 
  SidebarMenuItem, 
  SidebarFooter 
} from '@/components/ui/sidebar';

export default function StudentSidebar({ user }: { user: any }) {
  return (
    <Sidebar>
      <SidebarContent>
        <SidebarHeader>
          <div className="mb-8">
            <a href="/" className="text-lg font-bold text-white flex items-center gap-2 hover:underline">S-O-L</a>
            <div className="text-xs text-white/40">Student Dashboard</div>
          </div>
        </SidebarHeader>
        
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <a href="/dashboard/student">
                <BarChart2 className="w-4 h-4" />
                <span>Dashboard</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
          
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <a href="/dashboard/student/sections">
                <BookOpen className="w-4 h-4" />
                <span>My Sections</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>

          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <a href="/dashboard/student/quizzes">
                <FileText className="w-4 h-4" />
                <span>My Quizzes</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
          
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <a href="/dashboard/student/grades">
                <CheckCircle className="w-4 h-4" />
                <span>My Grades</span>
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
              <Badge className={user.paid ? 'bg-green-600/20 text-green-400 border-green-600' : 'bg-red-600/20 text-red-400 border-red-600'}>
                {user.paid ? 'Paid' : 'Unpaid'}
              </Badge>
            </div>
            <div className="text-xs text-white/30">&copy; {new Date().getFullYear()} S-O-L</div>
          </div>
        </SidebarFooter>
      </SidebarContent>
    </Sidebar>
  );
} 