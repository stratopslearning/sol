"use client";

import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiUrl } from "@/lib/basePath";

export default function ProfessorEnrollForm({
  onEnrolled,
}: {
  onEnrolled?: (section: { id: string; name: string }) => void;
}) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(null);
    setError(null);
    try {
      const res = await fetch(apiUrl("/api/professor/enroll"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enrollmentCode: code.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess(`Joined ${data.section.name}`);
        setCode("");
        if (onEnrolled) onEnrolled(data.section);
      } else {
        setError(data.error || "Failed to enroll");
      }
    } catch {
      setError("Server error");
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
          <Label htmlFor="prof-code">Faculty enrolment code</Label>
          <Input
            id="prof-code"
            placeholder="e.g. PROF-XXXX"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            required
            minLength={4}
          />
        </div>
        <Button
          type="submit"
          disabled={loading || !code.trim()}
          loading={loading}
        >
          {loading ? "Joining…" : "Join section"}
        </Button>
      </form>
      <div className="mt-3 flex flex-wrap gap-2">
        {success ? <Badge variant="success">{success}</Badge> : null}
        {error ? <Badge variant="destructive">{error}</Badge> : null}
      </div>
    </section>
  );
}
