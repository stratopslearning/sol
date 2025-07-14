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
            <Card className="rounded-xl shadow-lg bg-white/10 border border-white/10">
              <CardHeader>
                <CardTitle className="text-lg text-white">All Users</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-white/10">
                    <thead>
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-white/60 uppercase">Name</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-white/60 uppercase">Email</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-white/60 uppercase">Role</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-white/60 uppercase">Status</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-white/60 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                      {allUsers.map(user => (
                        <tr key={user.id} className="hover:bg-white/5 transition-colors">
                          <td className="px-4 py-2 text-white font-medium">{user.firstName || user.email}</td>
                          <td className="px-4 py-2 text-white/80">{user.email}</td>
                          <td className="px-4 py-2">
                            <Badge className={
                              user.role === 'ADMIN' ? 'bg-purple-600/20 text-purple-400 border-purple-600' :
                              user.role === 'PROFESSOR' ? 'bg-blue-600/20 text-blue-400 border-blue-600' :
                              'bg-green-600/20 text-green-400 border-green-600'
                            }>
                              {user.role}
                            </Badge>
                          </td>
                          <td className="px-4 py-2">
                            {user.paid !== undefined && (
                              <Badge className={user.paid ? 'bg-green-600/20 text-green-400 border-green-600' : 'bg-red-600/20 text-red-400 border-red-600'}>
                                {user.paid ? 'Active' : 'Inactive'}
                              </Badge>
                            )}
                          </td>
                          <td className="px-4 py-2 flex gap-2">
                            <UserActions user={user} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </section>
        </main>
      </div>
    </SidebarProvider>
  );
} 