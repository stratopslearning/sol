import { redirect } from "next/navigation";

import { withBasePath } from "@/lib/basePath";

export default function StudentLessonsRedirect() {
  redirect(withBasePath("/dashboard/student/assignments?type=LESSON"));
}
