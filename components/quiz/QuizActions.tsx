"use client";

import { Archive, Copy, Edit, Eye } from "lucide-react";

import { Button } from "@/components/ui/button";
import { apiUrl, withBasePath } from "@/lib/basePath";

interface QuizActionsProps {
  quizId: string;
  isActive: boolean;
}

export function QuizActions({ quizId, isActive }: QuizActionsProps) {
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
    <div className="inline-flex items-center gap-1">
      <Button asChild size="icon" variant="ghost" aria-label="View results">
        <a href={withBasePath(`/dashboard/professor/quiz/${quizId}/results`)}>
          <Eye className="h-4 w-4" />
        </a>
      </Button>
      <Button asChild size="icon" variant="ghost" aria-label="Edit quiz">
        <a href={withBasePath(`/dashboard/professor/quiz/${quizId}/edit`)}>
          <Edit className="h-4 w-4" />
        </a>
      </Button>
      <Button
        size="icon"
        variant="ghost"
        aria-label="Duplicate quiz"
        onClick={handleDuplicate}
      >
        <Copy className="h-4 w-4" />
      </Button>
      <Button
        size="icon"
        variant="ghost"
        aria-label={isActive ? "Archive quiz" : "Activate quiz"}
        onClick={handleArchive}
      >
        <Archive className="h-4 w-4" />
      </Button>
    </div>
  );
}
