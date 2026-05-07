"use client";

import React, { useState } from "react";
import { Edit, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiUrl } from "@/lib/basePath";

export type Course = {
  id: string;
  title: string;
  description?: string;
};

type Mode = "create" | "edit" | "delete";

export function CourseFormModal({
  mode,
  course,
}: {
  mode: Mode;
  course?: Course;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(course?.title || "");
  const [description, setDescription] = useState(course?.description || "");
  const [loading, setLoading] = useState(false);
  const isEdit = mode === "edit";
  const isDelete = mode === "delete";
  const isCreate = mode === "create";

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);
    try {
      if (isCreate) {
        await fetch(apiUrl("/api/admin/course"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, description }),
        });
        toast.success("Course created");
      } else if (isEdit && course) {
        await fetch(apiUrl(`/api/admin/course/${course.id}`), {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, description }),
        });
        toast.success("Course updated");
      } else if (isDelete && course) {
        await fetch(apiUrl(`/api/admin/course/${course.id}`), {
          method: "DELETE",
        });
        toast.success("Course deleted");
      }
      setOpen(false);
      window.location.reload();
    } finally {
      setLoading(false);
    }
  };

  let trigger;
  if (isCreate) {
    trigger = (
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> New course
      </Button>
    );
  } else if (isEdit) {
    trigger = (
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <Edit className="h-4 w-4" /> Edit
      </Button>
    );
  } else if (isDelete) {
    trigger = (
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <Trash2 className="h-4 w-4" /> Delete
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <span className="eyebrow text-ink-faint">
            {isCreate ? "New" : isEdit ? "Revise" : "Remove"}
          </span>
          <DialogTitle>
            {isCreate && "Create a course"}
            {isEdit && "Edit course"}
            {isDelete && "Delete course"}
          </DialogTitle>
          {isDelete && course ? (
            <DialogDescription>
              Are you sure you want to delete{" "}
              <span className="text-ink font-medium">{course.title}</span>? This
              cannot be undone.
            </DialogDescription>
          ) : null}
        </DialogHeader>

        {!isDelete ? (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="course-title">Title</Label>
              <Input
                id="course-title"
                placeholder="e.g. Introduction to Algorithms"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="course-description">Description</Label>
              <Textarea
                id="course-description"
                placeholder="A short summary of the course (optional)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={loading}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading} loading={loading}>
                {isCreate ? "Create course" : "Save changes"}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => handleSubmit()}
              disabled={loading}
              loading={loading}
            >
              Delete course
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
