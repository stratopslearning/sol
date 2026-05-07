"use client";

import { AppSidebar } from "@/components/layout/AppSidebar";

interface AdminSidebarProps {
  active?: string;
}

export default function AdminSidebar({ active }: AdminSidebarProps) {
  return <AppSidebar role="admin" active={active} />;
}
