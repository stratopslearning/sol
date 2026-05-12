"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Copy } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { apiUrl } from "@/lib/basePath";

export function CreateEditableCopyButton({ quizId }: { quizId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleCreateCopy = async () => {
    setLoading(true);
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
        description:
          "Your section now uses a professor-owned version of this quiz.",
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
      setLoading(false);
    }
  };

  return (
    <Button onClick={handleCreateCopy} loading={loading} disabled={loading}>
      <Copy className="h-4 w-4" />
      {loading ? "Creating copy..." : "Create editable copy"}
    </Button>
  );
}
