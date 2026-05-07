"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { apiUrl } from "@/lib/basePath";

const ROLES = ["STUDENT", "PROFESSOR", "ADMIN"];

export function UserActions({ user }: { user: any }) {
  const [loading, setLoading] = useState(false);

  const handleRoleSelect = async (role: string) => {
    if (role === user.role) return;
    if (!confirm(`Change role to ${role}?`)) return;
    setLoading(true);
    try {
      const res = await fetch(apiUrl(`/api/admin/user/${user.id}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      if (res.ok) {
        toast.success(`Role changed to ${role}`);
        setTimeout(() => window.location.reload(), 600);
      } else {
        toast.error("Failed to change role");
      }
    } catch {
      toast.error("Failed to change role");
    } finally {
      setLoading(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" variant="outline" disabled={loading}>
          Change role
          <ChevronDown className="h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Set role</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {ROLES.map((role) => (
          <DropdownMenuItem
            key={role}
            onSelect={() => handleRoleSelect(role)}
            disabled={loading}
            className={role === user.role ? "font-medium text-brand" : ""}
          >
            {role.toLowerCase()}
            {role === user.role ? (
              <span className="ml-auto text-xs text-ink-faint">current</span>
            ) : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
