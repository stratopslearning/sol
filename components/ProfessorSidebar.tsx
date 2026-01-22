"use client";
import { BarChart2, FileText, LogOut, TrendingUp, Menu, X, Layers } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { SignOutButton, useUser } from '@clerk/nextjs';
import * as React from 'react';
import { useState } from 'react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface ProfessorSidebarProps {
  active?: string;
}

const ProfessorSidebar: React.FC<ProfessorSidebarProps> = ({ active }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user: clerkUser } = useUser();

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };
  
  const getInitials = () => {
    if (clerkUser?.firstName && clerkUser?.lastName) {
      return `${clerkUser.firstName[0]}${clerkUser.lastName[0]}`.toUpperCase();
    }
    if (clerkUser?.firstName) {
      return clerkUser.firstName[0].toUpperCase();
    }
    if (clerkUser?.primaryEmailAddress?.emailAddress) {
      return clerkUser.primaryEmailAddress.emailAddress[0].toUpperCase();
    }
    return 'P';
  };
  
  const navItems = [
    { href: '/dashboard/professor', label: 'Dashboard', icon: BarChart2, key: 'dashboard' },
    { href: '/dashboard/professor/sections', label: 'My Sections', icon: Layers, key: 'sections' },
    { href: '/dashboard/professor/quizzes', label: 'My Quizzes', icon: FileText, key: 'quizzes' },
    { href: '/dashboard/professor/quiz-results', label: 'All Results', icon: TrendingUp, key: 'quiz-results' },
  ];

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex sticky top-0 h-screen w-64 bg-white/5 border-r border-white/10 backdrop-blur-sm flex-col p-6 animate-fade-in">
        <div className="mb-8 animate-slide-down">
          <a href="/" className="text-lg font-bold text-white flex items-center gap-2 hover:opacity-80 transition-opacity">S-O-L</a>
          <div className="text-xs text-white/40">Professor Dashboard</div>
        </div>
        <nav className="flex flex-col gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = active === item.key || (typeof window !== 'undefined' && window.location.pathname === item.href);
            return (
              <a
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 relative group",
                  isActive
                    ? "bg-white/10 text-white shadow-sm"
                    : "text-white/80 hover:bg-white/10 hover:text-white"
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="professorActiveIndicator"
                    className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-400 to-indigo-500 rounded-r-full pointer-events-none"
                    initial={false}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </a>
            );
          })}
          <SignOutButton redirectUrl="/">
            <button className="flex items-center gap-3 text-red-400 hover:bg-red-400/10 rounded-lg px-3 py-2.5 mt-4 w-full text-left transition-all duration-200 hover:text-red-300">
              <LogOut className="w-4 h-4" /> Logout
            </button>
          </SignOutButton>
        </nav>
        <div className="mt-auto pt-6 border-t border-white/10 animate-slide-up">
          <div className="flex items-center gap-3 mb-4 p-2 rounded-lg bg-white/5">
            <Avatar className="h-10 w-10">
              <AvatarImage src={clerkUser?.imageUrl} alt={clerkUser?.firstName || 'Professor'} />
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-sm font-semibold">
                {getInitials()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-white truncate">
                {clerkUser?.firstName || clerkUser?.primaryEmailAddress?.emailAddress || 'Professor'}
              </div>
              <div className="text-xs text-white/60 truncate">{clerkUser?.primaryEmailAddress?.emailAddress}</div>
            </div>
          </div>
          <div className="mb-2">
            <Badge className="bg-blue-600/20 text-blue-400 border-blue-600">Professor</Badge>
          </div>
          <div className="text-xs text-white/30">&copy; {new Date().getFullYear()} S-O-L</div>
        </div>
      </aside>

      {/* Mobile Menu Button */}
      <div className="md:hidden fixed top-4 left-4 z-50">
        <motion.button
          onClick={toggleMobileMenu}
          className="bg-white/10 hover:bg-white/20 text-white p-2.5 rounded-lg border border-white/20 backdrop-blur-sm min-h-[44px] min-w-[44px] flex items-center justify-center"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          aria-label="Toggle menu"
        >
          <Menu className="w-6 h-6" />
        </motion.button>
      </div>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <div className="md:hidden fixed inset-0 z-40">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={toggleMobileMenu}
            />
            
            {/* Sidebar */}
            <motion.div
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="absolute left-0 top-0 h-full w-64 bg-white/5 backdrop-blur-md border-r border-white/10 p-6 flex flex-col"
            >
              <div className="flex items-center justify-between mb-8">
                <div>
                  <a href="/" className="text-lg font-bold text-white flex items-center gap-2 hover:opacity-80 transition-opacity">S-O-L</a>
                  <div className="text-xs text-white/40">Professor Dashboard</div>
                </div>
                <button
                  onClick={toggleMobileMenu}
                  className="text-white/60 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                  aria-label="Close menu"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <nav className="flex flex-col gap-1">
                {navItems.map((item, index) => {
                  const Icon = item.icon;
                  const isActive = active === item.key || (typeof window !== 'undefined' && window.location.pathname === item.href);
                  return (
                    <motion.a
                      key={item.href}
                      href={item.href}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      onClick={toggleMobileMenu}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-all duration-200 min-h-[44px]",
                        isActive
                          ? "bg-white/10 text-white shadow-sm"
                          : "text-white/80 hover:bg-white/10 hover:text-white"
                      )}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span>{item.label}</span>
                    </motion.a>
                  );
                })}
                <SignOutButton redirectUrl="/">
                  <button className="flex items-center gap-3 text-red-400 hover:bg-red-400/10 rounded-lg px-3 py-3 mt-4 w-full text-left transition-all duration-200 hover:text-red-300 min-h-[44px]">
                    <LogOut className="w-4 h-4" /> Logout
                  </button>
                </SignOutButton>
              </nav>
              
              <div className="mt-auto pt-6 border-t border-white/10">
                <div className="flex items-center gap-3 mb-4 p-2 rounded-lg bg-white/5">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={clerkUser?.imageUrl} alt={clerkUser?.firstName || 'Professor'} />
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-sm font-semibold">
                      {getInitials()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-white truncate">
                      {clerkUser?.firstName || clerkUser?.primaryEmailAddress?.emailAddress || 'Professor'}
                    </div>
                    <div className="text-xs text-white/60 truncate">{clerkUser?.primaryEmailAddress?.emailAddress}</div>
                  </div>
                </div>
                <div className="mb-2">
                  <Badge className="bg-blue-600/20 text-blue-400 border-blue-600">Professor</Badge>
                </div>
                <div className="text-xs text-white/30">&copy; {new Date().getFullYear()} S-O-L</div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export default ProfessorSidebar; 