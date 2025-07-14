"use client";
import React, { useState } from "react";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../ui/dialog";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Edit, Plus, Trash2 } from "lucide-react";
import { toast } from 'sonner';

export type Course = {
  id: string;
  title: string;
  description?: string;
};

type Mode = "create" | "edit" | "delete";

export function CourseFormModal({ mode, course }: { mode: Mode; course?: Course }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(course?.title || "");
  const [description, setDescription] = useState(course?.description || "");
  const [loading, setLoading] = useState(false);
  const isEdit = mode === "edit";
  const isDelete = mode === "delete";
  const isCreate = mode === "create";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isCreate) {
        await fetch("/api/admin/course", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, description }),
        });
        toast.success("Course created successfully");
      } else if (isEdit && course) {
        await fetch(`/api/admin/course/${course.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, description }),
        });
        toast.success("Course updated successfully");
      } else if (isDelete && course) {
        await fetch(`/api/admin/course/${course.id}`, {
          method: "DELETE" });
        toast.success("Course deleted successfully");
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
      <Button variant="default" onClick={() => setOpen(true)}>
        <Plus className="w-4 h-4 mr-2" /> New Course
      </Button>
    );
  } else if (isEdit) {
    trigger = (
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <Edit className="w-4 h-4 mr-1" /> Edit
      </Button>
    );
  } else if (isDelete) {
    trigger = (
      <Button size="sm" variant="destructive" onClick={() => setOpen(true)}>
        <Trash2 className="w-4 h-4 mr-1" /> Delete
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isCreate && "Create Course"}
            {isEdit && "Edit Course"}
            {isDelete && "Delete Course"}
          </DialogTitle>
        </DialogHeader>
        {!isDelete ? (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              placeholder="Course Title"
              value={title}
              onChange={e => setTitle(e.target.value)}
              required
              disabled={loading}
            />
            <Input
              placeholder="Description (optional)"
              value={description}
              onChange={e => setDescription(e.target.value)}
              disabled={loading}
            />
            <DialogFooter>
              <Button type="submit" disabled={loading}>
                {isCreate && "Create"}
                {isEdit && "Save"}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <div className="flex flex-col gap-4">
            <p>Are you sure you want to delete <b>{course?.title}</b>?</p>
            <DialogFooter>
              <Button variant="destructive" onClick={handleSubmit} disabled={loading}>
                Delete
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
} 