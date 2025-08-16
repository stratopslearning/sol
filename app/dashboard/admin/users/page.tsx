import { db } from '@/app/db';
import { users } from '@/app/db/schema';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { SidebarProvider } from '@/components/ui/sidebar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LogOut, User, Shield, UserCheck, UserX } from 'lucide-react';
import Link from 'next/link';
import { SignOutButton } from '@clerk/nextjs';
import { UserActions } from '@/components/admin/UserActions';
import { Toaster } from '@/components/ui/sonner';
import AdminSidebar from '@/components/AdminSidebar';
import UserTableWithFilters from '@/components/admin/UserTableWithFilters';

export default async function AdminUsersPage() {
  const allUsers = await db.query.users.findMany();

  return (
    <SidebarProvider>
      <Toaster />
      <div className="min-h-screen w-screen bg-[#030303] flex">
        <AdminSidebar active="users" />
        <main className="flex-1 flex flex-col py-10 px-4 md:px-8 overflow-x-hidden">
          <section className="w-full max-w-7xl mx-auto mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">User Management</h1>
            <p className="text-white/60 text-lg">View and manage all users, roles, and status</p>
          </section>

          <section className="w-full max-w-7xl mx-auto">
            <UserTableWithFilters users={allUsers} />
          </section>
        </main>
      </div>
    </SidebarProvider>
  );
} 