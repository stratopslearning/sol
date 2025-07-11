"use client";
import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function StudentEnrollForm({ onEnrolled }: { onEnrolled?: (course: { id: string; title: string }) => void }) {
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
      const res = await fetch("/api/student/enroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enrollmentCode: code.trim() })
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess(`Enrolled in: ${data.course.title}`);
        setCode("");
        if (onEnrolled) onEnrolled(data.course);
      } else {
        setError(data.error || "Failed to enroll");
      }
    } catch {
      setError("Server error");
    }
    setLoading(false);
  };

  return (
    <Card className="mb-8 bg-white/10 border border-white/10">
      <CardHeader>
        <CardTitle className="text-lg text-white">Join a Course</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            placeholder="Enter enrollment code"
            value={code}
            onChange={e => setCode(e.target.value)}
            className="bg-white/5 border-white/20 text-white"
            required
            minLength={4}
          />
          <Button type="submit" disabled={loading || !code.trim()} className="w-full">
            {loading ? "Enrolling..." : "Join Course"}
          </Button>
          {success && <Badge className="bg-green-600/20 text-green-400 border-green-600">{success}</Badge>}
          {error && <Badge className="bg-red-600/20 text-red-400 border-red-600">{error}</Badge>}
        </form>
      </CardContent>
    </Card>
  );
} 