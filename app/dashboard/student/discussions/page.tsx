import { redirect } from "next/navigation";

import { withBasePath } from "@/lib/basePath";

export default function StudentDiscussionsRedirect() {
  redirect(withBasePath("/dashboard/student/assignments?type=DISCUSSION"));
}
