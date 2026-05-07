"use client";

import { useState } from "react";
import { Check, Copy, FileText, Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiUrl } from "@/lib/basePath";

interface Course {
  id: string;
  title: string;
  description?: string | null;
  enrollmentCode: string;
  status: string;
  createdAt: string;
}

export default function CourseCreationForm() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [createdCourse, setCreatedCourse] = useState<Course | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    setError("");

    try {
      const response = await fetch(apiUrl("/api/professor/course/create"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to create course");
      }

      setCreatedCourse(data.course);
      setTitle("");
      setDescription("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create course");
    } finally {
      setIsCreating(false);
    }
  };

  const copyToClipboard = async () => {
    if (!createdCourse) return;
    try {
      await navigator.clipboard.writeText(createdCourse.enrollmentCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy to clipboard:", err);
    }
  };

  const createAnother = () => {
    setCreatedCourse(null);
    setCopied(false);
  };

  if (createdCourse) {
    return (
      <section className="paper paper-shadow w-full max-w-md mx-auto p-6 md:p-8">
        <header className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 rounded-full bg-success-soft/60 border border-success/30 flex items-center justify-center">
            <Check className="h-4 w-4 text-success-fg" />
          </div>
          <span className="eyebrow text-ink-faint">Created</span>
          <h2 className="font-display text-xl text-ink mt-1">
            Course is live.
          </h2>
        </header>

        <div className="mt-6 hairline" />

        <div className="mt-6 flex flex-col gap-5">
          <div>
            <Label className="text-ink-faint">Course name</Label>
            <p className="text-ink font-medium mt-1">{createdCourse.title}</p>
          </div>

          <div>
            <Label className="text-ink-faint">Enrollment code</Label>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="default" className="font-mono px-3 py-1.5 text-sm">
                {createdCourse.enrollmentCode}
              </Badge>
              <Button
                onClick={copyToClipboard}
                variant="ghost"
                size="icon"
                aria-label="Copy code"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-success-fg" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-ink-faint mt-2">
              Share this code with learners to enrol them in the course.
            </p>
          </div>

          <Button
            onClick={createAnother}
            variant="outline"
            className="w-full"
          >
            <Plus className="h-4 w-4" />
            Create another course
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section className="paper paper-shadow w-full max-w-md mx-auto p-6 md:p-8">
      <header className="text-center">
        <div className="mx-auto mb-4 h-10 w-10 rounded-full bg-brand-soft border border-brand/30 flex items-center justify-center">
          <FileText className="h-4 w-4 text-brand" />
        </div>
        <span className="eyebrow text-ink-faint">New course</span>
        <h2 className="font-display text-xl text-ink mt-1">
          Compose a course.
        </h2>
        <p className="text-sm text-ink-muted mt-2 max-w-xs mx-auto">
          Create a course and get an enrolment code to share with your learners.
        </p>
      </header>

      <div className="mt-6 hairline" />

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="title">Course title *</Label>
          <Input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Mathematics 101"
            required
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="A short summary of the course (optional)"
            rows={3}
          />
        </div>

        {error ? (
          <div className="text-sm text-danger bg-danger-soft/40 border border-danger/30 rounded-md px-3 py-2">
            {error}
          </div>
        ) : null}

        <Button
          type="submit"
          disabled={isCreating || !title.trim()}
          loading={isCreating}
          className="w-full"
        >
          {isCreating ? "Creating…" : "Create course"}
        </Button>
      </form>
    </section>
  );
}
