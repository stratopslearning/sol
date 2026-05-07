import {
  BarChart2,
  FileText,
  Layers,
  Users,
  TrendingUp,
  CheckCircle,
  type LucideIcon,
} from "lucide-react";

import { withBasePath } from "@/lib/basePath";

export type AppRole = "admin" | "professor" | "student";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Match key — also used for legacy `active` prop on old sidebars. */
  key: string;
  /** Optional description shown only at top of sidebar group, not in row. */
  description?: string;
}

export interface RoleConfig {
  role: AppRole;
  /** Subtitle shown under the wordmark. */
  subtitle: string;
  /** Display label for role badge. */
  badge: string;
  /** Items in nav order. */
  items: NavItem[];
}

export const ROLE_CONFIG: Record<AppRole, RoleConfig> = {
  admin: {
    role: "admin",
    subtitle: "Administration",
    badge: "Administrator",
    items: [
      {
        href: withBasePath("/dashboard/admin"),
        label: "Overview",
        icon: BarChart2,
        key: "dashboard",
      },
      {
        href: withBasePath("/dashboard/admin/courses"),
        label: "Courses",
        icon: FileText,
        key: "courses",
      },
      {
        href: withBasePath("/dashboard/admin/sections"),
        label: "Sections",
        icon: Layers,
        key: "sections",
      },
      {
        href: withBasePath("/dashboard/admin/quizzes"),
        label: "Quizzes",
        icon: FileText,
        key: "quizzes",
      },
      {
        href: withBasePath("/dashboard/admin/users"),
        label: "People",
        icon: Users,
        key: "users",
      },
    ],
  },
  professor: {
    role: "professor",
    subtitle: "Faculty",
    badge: "Professor",
    items: [
      {
        href: withBasePath("/dashboard/professor"),
        label: "Overview",
        icon: BarChart2,
        key: "dashboard",
      },
      {
        href: withBasePath("/dashboard/professor/sections"),
        label: "My Sections",
        icon: Layers,
        key: "sections",
      },
      {
        href: withBasePath("/dashboard/professor/quizzes"),
        label: "My Quizzes",
        icon: FileText,
        key: "quizzes",
      },
      {
        href: withBasePath("/dashboard/professor/quiz-results"),
        label: "All Results",
        icon: TrendingUp,
        key: "quiz-results",
      },
    ],
  },
  student: {
    role: "student",
    subtitle: "Learner",
    badge: "Student",
    items: [
      {
        href: withBasePath("/dashboard/student"),
        label: "Overview",
        icon: BarChart2,
        key: "dashboard",
      },
      {
        href: withBasePath("/dashboard/student/sections"),
        label: "My Sections",
        icon: Layers,
        key: "sections",
      },
      {
        href: withBasePath("/dashboard/student/quizzes"),
        label: "My Quizzes",
        icon: FileText,
        key: "quizzes",
      },
      {
        href: withBasePath("/dashboard/student/grades"),
        label: "My Grades",
        icon: CheckCircle,
        key: "grades",
      },
    ],
  },
};
