"use client";
import { useState, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { UserActions } from '@/components/admin/UserActions';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import BulkImportModal from './BulkImportModal';

export default function UserTableWithFilters({ users }: { users: any[] }) {
  const [role, setRole] = useState<string>('ALL');
  const [search, setSearch] = useState<string>('');

  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const matchesRole = role === 'ALL' || user.role === role;
      const searchLower = search.toLowerCase();
      const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim().toLowerCase();
      const matchesSearch =
        fullName.includes(searchLower) ||
        user.firstName?.toLowerCase().includes(searchLower) ||
        user.lastName?.toLowerCase().includes(searchLower) ||
        user.email?.toLowerCase().includes(searchLower);
      return matchesRole && (!search || matchesSearch);
    });
  }, [users, role, search]);

  return (
    <Card className="rounded-xl shadow-lg bg-white/10 border border-white/10">
      <CardHeader>
        <CardTitle className="text-lg text-white">All Users</CardTitle>
        <div className="flex flex-col md:flex-row gap-4 mt-4">
          <div className="w-full md:w-48">
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger className="w-full border-white/20 bg-white dark:bg-[#18181b] text-black dark:text-white rounded-md px-3 py-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-white/20 bg-white dark:bg-[#18181b] text-black dark:text-white rounded-md">
                <SelectItem value="ALL">All Roles</SelectItem>
                <SelectItem value="STUDENT">Student</SelectItem>
                <SelectItem value="PROFESSOR">Professor</SelectItem>
                <SelectItem value="ADMIN">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1">
            <Input
              type="text"
              placeholder="Search by name or email..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-white/5 border-white/20 text-white"
            />
          </div>
          <div className="w-full md:w-auto">
            <BulkImportModal />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-white/10">
            <thead>
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-white/60 uppercase">Name</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-white/60 uppercase">Email</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-white/60 uppercase">Role</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-white/60 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {filteredUsers.map(user => (
                <tr key={user.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-4 py-2 text-white font-medium">
                    {user.firstName || user.lastName
                      ? `${user.firstName || ''}${user.lastName ? ' ' + user.lastName : ''}`.trim()
                      : user.email}
                  </td>
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
                  <td className="px-4 py-2 flex gap-2">
                    <UserActions user={user} />
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-center text-white/60 py-6">No users found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
} 