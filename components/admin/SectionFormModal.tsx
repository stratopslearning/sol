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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { apiUrl } from "@/lib/basePath";

export type Section = {
  id: string;
  name: string;
  professorEnrollmentCode: string;
  studentEnrollmentCode: string;
};

type Mode = "create" | "edit" | "delete";

export function SectionFormModal({
  mode,
  courseId: initialCourseId,
  section,
  bulk,
  allCourses,
}: {
  mode: Mode;
  courseId?: string;
  section?: Section;
  bulk?: boolean;
  allCourses?: { id: string; title: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(section?.name || "");
  const [bulkNames, setBulkNames] = useState("");
  const [loading, setLoading] = useState(false);
  const [courseId, setCourseId] = useState(
    initialCourseId || (allCourses && allCourses[0]?.id) || "",
  );
  const isEdit = mode === "edit";
  const isDelete = mode === "delete";
  const isCreate = mode === "create";
  const isBulk = !!bulk;

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);
    try {
      if (isCreate && isBulk) {
        const names = bulkNames
          .split("\n")
          .map((n) => n.trim())
          .filter(Boolean);
        if (names.length === 0) {
          toast.error("Please enter at least one section name");
          setLoading(false);
          return;
        }
        const res = await fetch(apiUrl(`/api/admin/section/bulk`), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ names, courseId }),
        });
        if (res.ok) {
          toast.success(`Created ${names.length} sections`);
          setOpen(false);
          setTimeout(() => window.location.reload(), 600);
        } else {
          toast.error("Failed to create sections");
        }
      } else if (isCreate) {
        await fetch(apiUrl(`/api/admin/section`), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, courseId }),
        });
        toast.success("Section created");
        setOpen(false);
        window.location.reload();
      } else if (isEdit && section) {
        await fetch(apiUrl(`/api/admin/section/${section.id}`), {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name }),
        });
        toast.success("Section updated");
        setOpen(false);
        window.location.reload();
      } else if (isDelete && section) {
        await fetch(apiUrl(`/api/admin/section/${section.id}`), {
          method: "DELETE",
        });
        toast.success("Section deleted");
        setOpen(false);
        window.location.reload();
      }
    } finally {
      setLoading(false);
    }
  };

  let trigger;
  if (isCreate && isBulk) {
    trigger = (
      <Button variant="outline" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> Bulk create
      </Button>
    );
  } else if (isCreate) {
    trigger = (
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> New section
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
            {isCreate ? (isBulk ? "Bulk" : "New") : isEdit ? "Revise" : "Remove"}
          </span>
          <DialogTitle>
            {isCreate && isBulk && "Bulk create sections"}
            {isCreate && !isBulk && "Create a section"}
            {isEdit && "Edit section"}
            {isDelete && "Delete section"}
          </DialogTitle>
          {isDelete && section ? (
            <DialogDescription>
              Are you sure you want to delete{" "}
              <span className="text-ink font-medium">{section.name}</span>? This
              cannot be undone.
            </DialogDescription>
          ) : null}
        </DialogHeader>

        {!isDelete ? (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {isCreate && allCourses && allCourses.length > 0 ? (
              <div className="flex flex-col gap-2">
                <Label htmlFor="course-select">Course</Label>
                <Select
                  value={courseId}
                  onValueChange={setCourseId}
                  disabled={loading}
                >
                  <SelectTrigger id="course-select">
                    <SelectValue placeholder="Select a course" />
                  </SelectTrigger>
                  <SelectContent>
                    {allCourses.map((course) => (
                      <SelectItem key={course.id} value={course.id}>
                        {course.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            {isCreate && isBulk ? (
              <div className="flex flex-col gap-2">
                <Label htmlFor="bulk-names">Section names</Label>
                <Textarea
                  id="bulk-names"
                  placeholder="One per line, e.g.&#10;Section A&#10;Section B"
                  value={bulkNames}
                  onChange={(e) => setBulkNames(e.target.value)}
                  rows={6}
                  disabled={loading}
                />
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <Label htmlFor="section-name">Section name</Label>
                <Input
                  id="section-name"
                  placeholder="e.g. Section 01"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
            )}

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
                {isCreate && isBulk && "Create sections"}
                {isCreate && !isBulk && "Create section"}
                {isEdit && "Save changes"}
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
              Delete section
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
