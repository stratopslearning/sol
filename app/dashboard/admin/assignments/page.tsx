import { redirect } from "next/navigation";

import { withBasePath } from "@/lib/basePath";

/** Admin assignments hub: reuse professor-style listing via quiz library for now. */
export default function AdminAssignmentsPage() {
  redirect(withBasePath("/dashboard/admin/quizzes"));
}
