"use client";

import { AppSidebar } from "@/components/layout/AppSidebar";

interface StudentSidebarUser {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  paid?: boolean | null;
}

export default function StudentSidebar({
  user,
}: {
  user: StudentSidebarUser;
}) {
  return <AppSidebar role="student" user={user} />;
}
