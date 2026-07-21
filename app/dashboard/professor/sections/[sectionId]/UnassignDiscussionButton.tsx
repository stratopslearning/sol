"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { apiUrl } from "@/lib/basePath";

export default function UnassignDiscussionButton({
  chatbotId,
  sectionId,
}: {
  chatbotId: string;
  sectionId: string;
}) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleUnassign = async () => {
    if (!confirm("Unassign this discussion from the section?")) return;
    setLoading(true);
    try {
      const res = await fetch(
        apiUrl(
          `/api/professor/section/${sectionId}/chatbot/${chatbotId}/unassign`,
        ),
        { method: "POST" },
      );
      if (res.ok) {
        router.refresh();
      } else {
        alert("Failed to unassign discussion");
      }
    } catch {
      alert("Failed to unassign discussion");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleUnassign}
      disabled={loading}
    >
      {loading ? "Unassigning…" : "Unassign"}
    </Button>
  );
}
