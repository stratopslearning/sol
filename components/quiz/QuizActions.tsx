"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Archive, Copy, Edit, Eye } from "lucide-react";
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
        throw new Error(data.error || "Failed to create editable copy");
      }

      toast.success("Editable copy created", {
        description: "Opening the professor-owned version now.",
      });
      router.push(`/dashboard/professor/quiz/${data.quiz.id}/edit`);
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to create editable copy",
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
              aria-label="Create editable copy"
              onClick={handleCreateEditableCopy}
              disabled={copyingForEdit}
            >
              <Edit className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">Create editable copy</TooltipContent>
        </Tooltip>
      )}

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
              <Archive className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">
            {isActive ? "Archive quiz" : "Activate quiz"}
          </TooltipContent>
        </Tooltip>
      ) : null}
    </div>
  );
}
