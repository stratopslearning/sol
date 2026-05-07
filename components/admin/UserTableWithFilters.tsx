"use client";

import { useMemo, useState } from "react";

import BulkImportModal from "@/components/admin/BulkImportModal";
import { UserActions } from "@/components/admin/UserActions";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const ROLE_VARIANT: Record<string, "default" | "info" | "success" | "accent"> = {
  ADMIN: "accent",
  PROFESSOR: "info",
  STUDENT: "success",
};

export default function UserTableWithFilters({ users }: { users: any[] }) {
  const [role, setRole] = useState<string>("ALL");
  const [search, setSearch] = useState<string>("");

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const matchesRole = role === "ALL" || user.role === role;
      const searchLower = search.toLowerCase();
      const fullName = `${user.firstName || ""} ${user.lastName || ""}`
        .trim()
        .toLowerCase();
      const matchesSearch =
        fullName.includes(searchLower) ||
        user.firstName?.toLowerCase().includes(searchLower) ||
        user.lastName?.toLowerCase().includes(searchLower) ||
        user.email?.toLowerCase().includes(searchLower);
      return matchesRole && (!search || matchesSearch);
    });
  }, [users, role, search]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center">
        <div className="md:w-48">
          <Select value={role} onValueChange={setRole}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All roles</SelectItem>
              <SelectItem value="STUDENT">Student</SelectItem>
              <SelectItem value="PROFESSOR">Professor</SelectItem>
              <SelectItem value="ADMIN">Admin</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Input
          type="search"
          placeholder="Search by name or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1"
        />
        <BulkImportModal />
      </div>

      <div className="paper paper-shadow overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">
                  {user.firstName || user.lastName
                    ? `${user.firstName || ""}${
                        user.lastName ? " " + user.lastName : ""
                      }`.trim()
                    : user.email}
                </TableCell>
                <TableCell className="text-ink-muted font-mono text-xs">
                  {user.email}
                </TableCell>
                <TableCell>
                  <Badge variant={ROLE_VARIANT[user.role] ?? "secondary"}>
                    {user.role}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <UserActions user={user} />
                </TableCell>
              </TableRow>
            ))}
            {filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="text-center text-ink-muted py-8"
                >
                  No people found.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
