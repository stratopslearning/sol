import { redirect } from "next/navigation";

import { withBasePath } from "@/lib/basePath";

export default function ProfessorDiscussionsRedirect() {
  redirect(withBasePath("/dashboard/professor/assignments?type=DISCUSSION"));
}
