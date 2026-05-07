"use client";

import { motion, useReducedMotion } from "framer-motion";

import LeaveSectionButton from "@/components/LeaveSectionButton";
import { Badge } from "@/components/ui/badge";

interface Enrollment {
  id: string;
  section: {
    id: string;
    name: string;
  };
}

interface EnrollmentListProps {
  enrollments: Enrollment[];
}

export function EnrollmentList({ enrollments }: EnrollmentListProps) {
  const reduced = useReducedMotion();

  if (enrollments.length === 0) {
    return (
      <div className="text-center py-10 px-4 flex flex-col gap-2 items-center">
        <span className="eyebrow text-ink-faint">Empty</span>
        <p
          className="font-display text-ink"
          style={{
            fontSize: "1.25rem",
            lineHeight: 1.25,
            fontVariationSettings: '"opsz" 36',
          }}
        >
          No sections yet.
        </p>
        <p className="text-sm text-ink-muted max-w-sm leading-relaxed">
          Join a section using the enrollment code provided by your professor.
        </p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-rule">
      {enrollments.map((enrollment, index) => (
        <motion.li
          key={enrollment.id}
          initial={reduced ? false : { opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: reduced ? 0 : index * 0.04, duration: 0.25 }}
          className="flex items-center justify-between gap-3 px-4 py-3.5"
        >
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium text-ink truncate">
              {enrollment.section.name}
            </div>
            <div className="text-xs text-ink-faint mt-0.5">Section</div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Badge variant="success">Enrolled</Badge>
            <LeaveSectionButton
              sectionId={enrollment.section.id}
              sectionName={enrollment.section.name}
            />
          </div>
        </motion.li>
      ))}
    </ul>
  );
}
