import { redirect } from "next/navigation";

import { withBasePath } from "@/lib/basePath";

export default function StudentQuizzesRedirect() {
  redirect(withBasePath("/dashboard/student/assignments?type=QUIZ"));
}
