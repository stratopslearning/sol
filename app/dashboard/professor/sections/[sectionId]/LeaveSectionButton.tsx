"use client";
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
      const res = await fetch(`/api/professor/section/${sectionId}/leave`, {
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
    <Button type="button" variant="destructive" className="mt-6 w-full md:w-auto" onClick={handleLeave} disabled={loading}>
      {loading ? "Leaving..." : "Leave Section"}
    </Button>
  );
} 