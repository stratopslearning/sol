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

export function UserActions({
  user,
}: {
  user: {
    id: string;
    email: string | null;
    role: string;
    firstName?: string | null;
    lastName?: string | null;
  };
}) {
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

  const handleDelete = async () => {
    const label = user.email || user.id;
    const ok = confirm(
      `Permanently delete ${label}?\n\nThis removes their Clerk account first, then the SOL profile. Quizzes they authored are reassigned to you. This cannot be undone.`,
    );
    if (!ok) return;
    const typed = window.prompt(
      `Type DELETE to confirm removal of ${label}`,
    );
    if (typed !== "DELETE") {
      toast.message("Delete cancelled");
      return;
    }

    setLoading(true);
    try {
      const runDelete = (allowMissingClerk: boolean) =>
        fetch(
          apiUrl(
            `/api/admin/user/${user.id}${allowMissingClerk ? "?allowMissingClerk=1" : ""}`,
          ),
          { method: "DELETE" },
        );

      let res = await runDelete(false);
      let data = (await res.json().catch(() => ({}))) as {
        error?: string;
        allowMissingClerk?: boolean;
        clerkDeleted?: boolean;
      };

      if (res.status === 409 && data.allowMissingClerk) {
        const orphanOk = confirm(
          `${data.error}\n\nDelete the SOL row only (Clerk user not found with this API key)?`,
        );
        if (!orphanOk) {
          toast.message("Delete cancelled");
          return;
        }
        res = await runDelete(true);
        data = (await res.json().catch(() => ({}))) as typeof data;
      }

      if (res.ok) {
        toast.success(
          data.clerkDeleted === false
            ? "SOL profile deleted (Clerk was already missing)"
            : "User deleted from Clerk and SOL",
        );
        setTimeout(() => window.location.reload(), 600);
      } else {
        toast.error(data.error || "Failed to delete user");
      }
    } catch {
      toast.error("Failed to delete user");
    } finally {
      setLoading(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" variant="outline" disabled={loading}>
          Actions
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
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={(e) => {
            e.preventDefault();
            void handleDelete();
          }}
          disabled={loading}
          className="text-danger focus:text-danger"
        >
          Delete user…
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
