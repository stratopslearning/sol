"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from '@/components/ui/button';

export default function UnassignQuizButton({ quizId, sectionId }: { quizId: string, sectionId: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleUnassign = async () => {
    if (!confirm("Unassign this quiz from the section?")) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/professor/section/${sectionId}/quiz/${quizId}/unassign`, {
        method: "POST",
      });
      if (res.ok) {
        router.refresh();
      } else {
        alert("Failed to unassign quiz");
      }
    } catch (err) {
      alert("Failed to unassign quiz");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button type="button" variant="destructive" size="sm" onClick={handleUnassign} disabled={loading}>
      {loading ? "Unassigning..." : "Unassign"}
    </Button>
  );
} 