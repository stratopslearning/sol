import { redirect } from "next/navigation";

import { withBasePath } from "@/lib/basePath";

export default function ProfessorQuizzesRedirect() {
  redirect(withBasePath("/dashboard/professor/assignments?type=QUIZ"));
}
