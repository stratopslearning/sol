"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiUrl } from "@/lib/basePath";

export default function StudentEnrollForm({
  onEnrolled,
}: {
  onEnrolled?: (section: {
    id: string;
    name: string;
    course: { title: string };
  }) => void;
}) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(apiUrl("/api/student/enroll"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enrollmentCode: code.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Joined ${data.section.name}`, {
          description: `Course: ${data.section.course.title}`,
        });
        setCode("");
        if (onEnrolled) onEnrolled(data.section);
        setTimeout(() => window.location.reload(), 800);
      } else {
        const errorMsg = data.error || "Failed to enroll";
        setError(errorMsg);
        toast.error(errorMsg);
      }
    } catch {
      const errorMsg = "Server error. Please try again.";
      setError(errorMsg);
      toast.error(errorMsg);
    }
    setLoading(false);
  };

  return (
    <section className="paper paper-shadow p-6 mb-8">
      <header>
        <span className="eyebrow text-ink-faint">Join</span>
        <h2 className="font-display text-lg text-ink mt-1">Add a section</h2>
      </header>
      <form
        onSubmit={handleSubmit}
        className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end"
      >
        <div className="flex-1 flex flex-col gap-2">
          <Label htmlFor="enrollment-code">Enrolment code</Label>
          <Input
            id="enrollment-code"
            placeholder="Enter the code your professor shared"
            value={code}
            onChange={(e) => {
              setCode(e.target.value);
              setError(null);
            }}
            aria-invalid={!!error}
            aria-describedby={error ? "enrollment-error" : undefined}
            required
            minLength={4}
          />
          {error ? (
            <p id="enrollment-error" className="text-sm text-danger" role="alert">
              {error}
            </p>
          ) : null}
        </div>
        <Button
          type="submit"
          disabled={loading || !code.trim()}
          loading={loading}
        >
          {loading ? "Joining…" : "Join section"}
        </Button>
      </form>
    </section>
  );
}
