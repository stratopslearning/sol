"use client";
import React, { useState } from "react";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../ui/dialog";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Edit, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export type Section = {
  id: string;
  name: string;
  professorEnrollmentCode: string;
  studentEnrollmentCode: string;
};

type Mode = "create" | "edit" | "delete";

export function SectionFormModal({ mode, courseId: initialCourseId, section, bulk, allCourses }: { mode: Mode; courseId?: string; section?: Section; bulk?: boolean; allCourses?: { id: string; title: string }[] }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(section?.name || "");
  const [bulkNames, setBulkNames] = useState("");
  const [loading, setLoading] = useState(false);
  const [courseId, setCourseId] = useState(initialCourseId || (allCourses && allCourses[0]?.id) || "");
  const isEdit = mode === "edit";
  const isDelete = mode === "delete";
  const isCreate = mode === "create";
  const isBulk = !!bulk;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isCreate && isBulk) {
        // Bulk create
        const names = bulkNames.split("\n").map(n => n.trim()).filter(Boolean);
        if (names.length === 0) {
          toast.error("Please enter at least one section name");
          setLoading(false);
          return;
        }
        const res = await fetch(`/api/admin/section/bulk`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ names, courseId }),
        });
        if (res.ok) {
          toast.success(`Created ${names.length} sections`);
          setOpen(false);
          setTimeout(() => window.location.reload(), 1000);
        } else {
          toast.error("Failed to create sections");
        }
      } else if (isCreate) {
        await fetch(`/api/admin/section`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, courseId }),
        });
        toast.success("Section created successfully");
        setOpen(false);
        window.location.reload();
      } else if (isEdit && section) {
        await fetch(`/api/admin/section/${section.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name }),
        });
        toast.success("Section updated successfully");
        setOpen(false);
        window.location.reload();
      } else if (isDelete && section) {
        await fetch(`/api/admin/section/${section.id}`, {
          method: "DELETE"
        });
        toast.success("Section deleted successfully");
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
      <Button variant="secondary" onClick={() => setOpen(true)}>
        <Plus className="w-4 h-4 mr-2" /> Bulk Create Sections
      </Button>
    );
  } else if (isCreate) {
    trigger = (
      <Button variant="default" onClick={() => setOpen(true)}>
        <Plus className="w-4 h-4 mr-2" /> New Section
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
            {isCreate && isBulk && "Bulk Create Sections"}
            {isCreate && !isBulk && "Create Section"}
            {isEdit && "Edit Section"}
            {isDelete && "Delete Section"}
          </DialogTitle>
        </DialogHeader>
        {!isDelete ? (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {(isCreate && allCourses && allCourses.length > 0) && (
              <select
                className="border rounded p-2 text-sm"
                value={courseId}
                onChange={e => setCourseId(e.target.value)}
                required
                disabled={loading}
              >
                {allCourses.map(course => (
                  <option key={course.id} value={course.id}>{course.title}</option>
                ))}
              </select>
            )}
            {isCreate && isBulk ? (
              <textarea
                placeholder="Enter section names, one per line"
                value={bulkNames}
                onChange={e => setBulkNames(e.target.value)}
                rows={6}
                className="border rounded p-2 text-sm"
                disabled={loading}
              />
            ) : (
              <Input
                placeholder="Section Name"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                disabled={loading}
              />
            )}
            <DialogFooter>
              <Button type="submit" disabled={loading}>
                {isCreate && isBulk && "Create Sections"}
                {isCreate && !isBulk && "Create"}
                {isEdit && "Save"}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <div className="flex flex-col gap-4">
            <p>Are you sure you want to delete <b>{section?.name}</b>?</p>
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