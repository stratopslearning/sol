"use client";
import { useState, useEffect, useRef } from "react";
import { Button } from "../ui/button";
import { ChevronDown } from "lucide-react";
import { toast } from "sonner";

const ROLES = ["STUDENT", "PROFESSOR", "ADMIN"];

export function UserActions({ user }: { user: any }) {
  const [loading, setLoading] = useState(false);
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const [selectedRole, setSelectedRole] = useState(user.role);
  const [dropdownPosition, setDropdownPosition] = useState<'top' | 'bottom'>('bottom');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleChangeRole = async () => {
    // Calculate available space and position dropdown accordingly
    if (buttonRef.current) {
      const buttonRect = buttonRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const dropdownHeight = 120; // Approximate height of dropdown
      
      // Check if there's enough space below
      const spaceBelow = viewportHeight - buttonRect.bottom;
      // Check if there's enough space above
      const spaceAbove = buttonRect.top;
      
      // Add some buffer space (20px) to ensure it doesn't touch edges
      if (spaceBelow >= dropdownHeight + 20 || spaceBelow > spaceAbove) {
        setDropdownPosition('bottom');
      } else {
        setDropdownPosition('top');
      }
    }
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



  // Close dropdown when clicking outside and ensure visibility
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowRoleDropdown(false);
      }
    };

    const ensureDropdownVisibility = () => {
      if (dropdownRef.current && buttonRef.current) {
        const dropdownRect = dropdownRef.current.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        
        // If dropdown is cut off at the top
        if (dropdownRect.top < 0) {
          setDropdownPosition('bottom');
        }
        // If dropdown is cut off at the bottom
        else if (dropdownRect.bottom > viewportHeight) {
          setDropdownPosition('top');
        }
      }
    };

    if (showRoleDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      // Check visibility after a short delay to allow for positioning
      setTimeout(ensureDropdownVisibility, 10);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showRoleDropdown]);

  return (
    <div className="flex gap-2 relative">
      {showRoleDropdown ? (
        <div 
          ref={dropdownRef} 
          className={`absolute z-50 bg-white text-black rounded-lg shadow-lg border border-gray-200 w-32 left-0 min-w-max ${
            dropdownPosition === 'top' 
              ? 'bottom-full mb-1' 
              : 'top-full mt-1'
          }`}
        >
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
        <Button 
          ref={buttonRef}
          size="sm" 
          variant="outline" 
          className="text-xs flex items-center gap-1" 
          onClick={handleChangeRole} 
          disabled={loading}
        >
          Change Role
          <ChevronDown className="w-3 h-3" />
        </Button>
      )}
    </div>
  );
} 