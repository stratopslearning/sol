"use client";

import { AppSidebar } from "@/components/layout/AppSidebar";

interface ProfessorSidebarProps {
  active?: string;
}

export default function ProfessorSidebar({ active }: ProfessorSidebarProps) {
  return <AppSidebar role="professor" active={active} />;
}
