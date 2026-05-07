"use client";
import { apiUrl } from "@/lib/basePath";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from '@/components/ui/button';

export default function LeaveSectionButton({ sectionId }: { sectionId: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLeave = async () => {
    if (!confirm("Are you sure you want to leave this section?")) return;
    setLoading(true);
    try {
      const res = await fetch(apiUrl(`/api/professor/section/${sectionId}/leave`), {
        method: "POST",
      });
      if (res.ok) {
        router.push("/dashboard/professor/sections");
      } else {
        alert("Failed to leave section");
      }
    } catch (err) {
      alert("Failed to leave section");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      onClick={handleLeave}
      disabled={loading}
    >
      {loading ? "Leaving…" : "Leave section"}
    </Button>
  );
} 