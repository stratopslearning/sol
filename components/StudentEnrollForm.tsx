"use client";
import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function StudentEnrollForm({ onEnrolled }: { onEnrolled?: (section: { id: string; name: string; course: { title: string } }) => void }) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/student/enroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enrollmentCode: code.trim() })
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Successfully enrolled in ${data.section.name}`, {
          description: `Course: ${data.section.course.title}`,
        });
        setCode("");
        if (onEnrolled) onEnrolled(data.section);
        // Refresh to show new enrollment
        setTimeout(() => window.location.reload(), 1000);
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
    <Card className="mb-8 bg-white/10 border border-white/10 hover:shadow-lg transition-shadow animate-scale-in">
      <CardHeader>
        <CardTitle className="text-lg text-white">Join a Section</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="space-y-2">
            <Label htmlFor="enrollment-code" className="text-white/80">Enrollment Code</Label>
            <Input
              id="enrollment-code"
              placeholder="Enter enrollment code"
              value={code}
              onChange={e => {
                setCode(e.target.value);
                setError(null);
              }}
              className={`bg-white/5 border-white/20 text-white focus:ring-2 focus:ring-blue-500/50 ${
                error ? 'border-red-500/50 focus:ring-red-500/50' : ''
              }`}
              required
              minLength={4}
              aria-invalid={!!error}
              aria-describedby={error ? "enrollment-error" : undefined}
            />
            {error && (
              <p id="enrollment-error" className="text-sm text-red-400 animate-slide-down" role="alert">
                {error}
              </p>
            )}
          </div>
          <Button 
            type="submit" 
            disabled={loading || !code.trim()} 
            className="w-full"
            loading={loading}
          >
            {loading ? "Enrolling..." : "Join Section"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
} 