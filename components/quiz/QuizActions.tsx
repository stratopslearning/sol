"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Archive,
  ArchiveRestore,
  Copy,
  Edit,
  Eye,
  MessagesSquare,
} from "lucide-react";
import { toast } from "sonner";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { apiUrl, withBasePath } from "@/lib/basePath";

interface QuizActionsProps {
  quizId: string;
  isActive: boolean;
  isCreatedByProfessor?: boolean;
}

export function QuizActions({
  quizId,
  isActive,
  isCreatedByProfessor = true,
}: QuizActionsProps) {
  const router = useRouter();
  const [copyingForEdit, setCopyingForEdit] = useState(false);

  const handleCreateEditableCopy = async () => {
    setCopyingForEdit(true);
    try {
      const response = await fetch(
        apiUrl(`/api/professor/quiz/${quizId}/section-copy`),
        { method: "POST" },
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to open quiz for editing");
      }

      toast.success("Ready to edit", {
        description: "Opening your section’s version of this quiz.",
      });
      router.push(`/dashboard/professor/quiz/${data.quiz.id}/edit`);
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to open quiz for editing",
      );
    } finally {
      setCopyingForEdit(false);
    }
  };

  const handleDuplicate = async () => {
    if (!confirm("Duplicate this quiz?")) return;
    try {
      const response = await fetch(
        apiUrl(`/api/professor/quiz/${quizId}/duplicate`),
        { method: "POST" },
      );
      if (response.ok) window.location.reload();
      else alert("Failed to duplicate quiz");
    } catch (error) {
      console.error("Error duplicating quiz:", error);
      alert("Failed to duplicate quiz");
    }
  };

  const handleArchive = async () => {
    if (
      !confirm(
        `Are you sure you want to ${isActive ? "archive" : "activate"} this quiz?`,
      )
    )
      return;
    try {
      const response = await fetch(
        apiUrl(`/api/professor/quiz/${quizId}/archive`),
        { method: "POST" },
      );
      if (response.ok) window.location.reload();
      else alert("Failed to update quiz");
    } catch (error) {
      console.error("Error archiving quiz:", error);
      alert("Failed to update quiz");
    }
  };

  return (
    <div className="inline-flex min-w-max items-center justify-end gap-1">
      <Tooltip>
        <TooltipTrigger asChild>
          <a
            href={withBasePath(`/dashboard/professor/quiz/${quizId}/results`)}
            className={buttonVariants({ size: "iconSm", variant: "ghost" })}
            aria-label="View results"
          >
            <Eye className="h-4 w-4" />
          </a>
        </TooltipTrigger>
        <TooltipContent side="top">View results</TooltipContent>
      </Tooltip>

      {isCreatedByProfessor ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <a
              href={withBasePath(`/dashboard/professor/quiz/${quizId}/edit`)}
              className={buttonVariants({ size: "iconSm", variant: "ghost" })}
              aria-label="Edit quiz"
            >
              <Edit className="h-4 w-4" />
            </a>
          </TooltipTrigger>
          <TooltipContent side="top">Edit quiz</TooltipContent>
        </Tooltip>
      ) : (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="iconSm"
              variant="ghost"
              aria-label="Edit"
              onClick={handleCreateEditableCopy}
              disabled={copyingForEdit}
            >
              <Edit className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">Edit</TooltipContent>
        </Tooltip>
      )}

      <Tooltip>
        <TooltipTrigger asChild>
          <a
            href={withBasePath(
              `/dashboard/professor/discussions/new?quizId=${quizId}`,
            )}
            className={buttonVariants({ size: "iconSm", variant: "ghost" })}
            aria-label="Create discussion from quiz"
          >
            <MessagesSquare className="h-4 w-4" />
          </a>
        </TooltipTrigger>
        <TooltipContent side="top">Create discussion</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            size="iconSm"
            variant="ghost"
            aria-label="Duplicate quiz"
            onClick={handleDuplicate}
          >
            <Copy className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top">Duplicate quiz</TooltipContent>
      </Tooltip>

      {isCreatedByProfessor ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="iconSm"
              variant="ghost"
              aria-label={isActive ? "Archive quiz" : "Activate quiz"}
              onClick={handleArchive}
            >
              {isActive ? (
                <Archive className="h-4 w-4" />
              ) : (
                <ArchiveRestore className="h-4 w-4" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">
            {isActive ? "Archive quiz" : "Activate quiz"}
          </TooltipContent>
        </Tooltip>
      ) : (
        // Keep icon columns aligned when archive is unavailable (shared quizzes).
        <span className="inline-flex size-8 shrink-0" aria-hidden />
      )}
    </div>
  );
}
