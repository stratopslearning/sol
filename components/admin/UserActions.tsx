"use client";
import { useState, useEffect, useRef } from "react";
import { Button } from "../ui/button";
import { UserCheck, UserX, ChevronDown } from "lucide-react";
import { toast } from "sonner";

const ROLES = ["STUDENT", "PROFESSOR", "ADMIN"];

export function UserActions({ user }: { user: any }) {
  const [loading, setLoading] = useState(false);
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const [selectedRole, setSelectedRole] = useState(user.role);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleChangeRole = async () => {
    setShowRoleDropdown(true);
  };

  const handleRoleSelect = async (role: string) => {
    if (role === user.role) {
      setShowRoleDropdown(false);
      return;
    }
    if (!confirm(`Change role to ${role}?`)) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/user/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      if (res.ok) {
        toast.success(`Role changed to ${role}`);
        setSelectedRole(role);
        setTimeout(() => window.location.reload(), 1000);
      } else {
        toast.error("Failed to change role");
      }
    } catch {
      toast.error("Failed to change role");
    }
    setLoading(false);
    setShowRoleDropdown(false);
  };

  const handleToggleActive = async () => {
    const newPaid = !user.paid;
    if (!confirm(`${newPaid ? "Activate" : "Deactivate"} this user?`)) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/user/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paid: newPaid }),
      });
      if (res.ok) {
        toast.success(newPaid ? "User activated" : "User deactivated");
        setTimeout(() => window.location.reload(), 1000);
      } else {
        toast.error("Failed to update user status");
      }
    } catch {
      toast.error("Failed to update user status");
    }
    setLoading(false);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowRoleDropdown(false);
      }
    };

    if (showRoleDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showRoleDropdown]);

  return (
    <div className="flex gap-2 relative">
      {showRoleDropdown ? (
        <div ref={dropdownRef} className="absolute z-50 bg-white text-black rounded-lg shadow-lg border border-gray-200 w-32 bottom-full left-0 mb-1 min-w-max">
          {ROLES.map(role => (
            <button
              key={role}
              className={`w-full text-left px-4 py-2 hover:bg-gray-100 transition-colors ${role === user.role ? 'font-bold bg-blue-50 text-blue-700' : 'text-gray-700'}`}
              onClick={() => handleRoleSelect(role)}
              disabled={loading}
            >
              {role}
            </button>
          ))}
        </div>
      ) : (
        <Button size="sm" variant="outline" className="text-xs flex items-center gap-1" onClick={handleChangeRole} disabled={loading}>
          Change Role
          <ChevronDown className="w-3 h-3" />
        </Button>
      )}
      <Button size="sm" variant={user.paid ? "destructive" : "secondary"} className="text-xs" onClick={handleToggleActive} disabled={loading}>
        {user.paid ? <UserX className="w-4 h-4 mr-1" /> : <UserCheck className="w-4 h-4 mr-1" />}
        {user.paid ? "Deactivate" : "Activate"}
      </Button>
    </div>
  );
} 