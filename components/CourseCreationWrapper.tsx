"use client";
import dynamic from 'next/dynamic';

const CourseCreationForm = dynamic(() => import('@/components/CourseCreationForm'), { ssr: false });

export default function CourseCreationWrapper() {
  return <CourseCreationForm />;
} 