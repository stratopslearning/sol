"use client";
import dynamic from 'next/dynamic';

const ExportResultsSection = dynamic(() => import('@/components/ExportResultsSection'), { ssr: false });

export default function ExportResultsWrapper({ quizzes }: { quizzes: { id: string; title: string }[] }) {
  return <ExportResultsSection quizzes={quizzes} />;
} 