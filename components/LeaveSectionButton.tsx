"use client";

import { useState } from "react";
import { LogOut } from "@/components/icons";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { apiUrl } from "@/lib/basePath";
import { cn } from "@/lib/utils";

interface LeaveSectionButtonProps {
  sectionId: string;
  sectionName: string;
  onSuccess?: () => void;
  /** Quieter secondary action by default (ghost). */
  variant?: "ghost" | "outline" | "destructive";
  className?: string;
}

export default function LeaveSectionButton({
  sectionId,
  sectionName,
  onSuccess,
  variant = "ghost",
  className,
}: LeaveSectionButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleLeaveSection = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        apiUrl(`/api/student/section/${sectionId}/leave`),
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      const data = await response.json();

      if (response.ok) {
        toast.success("Successfully left section");
        if (onSuccess) {
          onSuccess();
        } else {
          window.location.reload();
        }
      } else {
        toast.error(data.error || "Failed to leave section");
      }
    } catch (error) {
      console.error("Error leaving section:", error);
      toast.error("Failed to leave section");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          type="button"
          variant={variant}
          size="sm"
          className={cn(
            variant === "ghost" &&
              "text-ink-muted hover:bg-destructive/10 hover:text-destructive",
            className,
          )}
        >
          <LogOut className="h-3.5 w-3.5" aria-hidden />
          Leave
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <span className="eyebrow text-ink-faint">Leave</span>
          <AlertDialogTitle>Leave {sectionName}?</AlertDialogTitle>
          <AlertDialogDescription>
            You will lose access to assignments and materials for this section.
            You can re-join later with a new code.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleLeaveSection} disabled={isLoading}>
            {isLoading ? "Leaving…" : "Leave section"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
