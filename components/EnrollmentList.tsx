"use client";

import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import LeaveSectionButton from '@/components/LeaveSectionButton';

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
  if (enrollments.length === 0) {
    return (
      <div className="text-center py-8 text-white/60 animate-fade-in">
        <div className="w-12 h-12 mx-auto mb-4 opacity-50 text-white/40">📚</div>
        <p className="text-base font-medium text-white/80 mb-2">No sections enrolled yet</p>
        <div className="text-white/50 text-sm">Join a section using the enrollment code from your dashboard.</div>
      </div>
    );
  }

  return (
    <>
      {enrollments.map((enrollment, index) => (
        <motion.div
          key={enrollment.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
        >
          <div className="flex-1">
            <div className="text-sm font-medium text-white">
              {enrollment.section.name}
            </div>
            <div className="text-xs text-white/60">
              Section
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-green-600/20 text-green-400 border-green-600">
              Enrolled
            </Badge>
            <LeaveSectionButton 
              sectionId={enrollment.section.id} 
              sectionName={enrollment.section.name}
            />
          </div>
        </motion.div>
      ))}
    </>
  );
}
