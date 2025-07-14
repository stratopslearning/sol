"use client";
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Layers, Copy } from 'lucide-react';
import React, { useState } from 'react';
import { SectionFormModal } from '@/components/admin/SectionFormModal';

export default function SectionsPageContentClient({ allSections, allCourses }: { allSections: any[]; allCourses: any[] }) {
  const [filter, setFilter] = useState('');
  const filteredSections = allSections.filter(section =>
    section.name.toLowerCase().includes(filter.toLowerCase()) ||
    section.professorEnrollmentCode.toLowerCase().includes(filter.toLowerCase()) ||
    section.studentEnrollmentCode.toLowerCase().includes(filter.toLowerCase()) ||
    (section.course?.title?.toLowerCase() || '').includes(filter.toLowerCase())
  );

  return (
    <div className="min-h-screen w-screen bg-[#030303] flex">
      <main className="flex-1 flex flex-col py-10 px-4 md:px-8 overflow-x-hidden">
        <section className="w-full max-w-7xl mx-auto mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Sections</h1>
          <p className="text-white/60 text-lg">View and manage all sections across courses</p>
        </section>
        <div className="max-w-md mb-6">
          <input
            type="text"
            placeholder="Search by section, course, or code..."
            value={filter}
            onChange={e => setFilter(e.target.value)}
            className="w-full border rounded px-3 py-2 text-sm"
          />
        </div>
        <div className="flex gap-2 mb-6">
          <SectionFormModal mode="create" allCourses={allCourses} />
          <SectionFormModal mode="create" bulk allCourses={allCourses} />
        </div>
        <section className="w-full max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSections.map(section => (
              <Card key={section.id} className="rounded-2xl shadow-xl bg-white/5 border border-white/10 hover:shadow-2xl transition-shadow flex flex-col justify-between min-h-[120px] p-0">
                <CardHeader className="flex flex-row items-center justify-between gap-4 p-6 pb-2">
                  <div className="flex items-center gap-3">
                    <Layers className="w-6 h-6 text-green-400" />
                    <CardTitle className="text-xl text-white font-semibold">{section.name}</CardTitle>
                  </div>
                  <div className="flex items-center">
                    <SectionFormModal mode="delete" section={section} />
                  </div>
                </CardHeader>
                <CardContent className="px-6 pb-6 pt-2">
                  <div className="text-white/70 text-base block min-h-[24px]">Course: {section.course?.title || 'Unknown'}</div>
                  <div className="flex flex-col gap-2 mt-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Professor Code:</span>
                      <span className="font-mono text-sm bg-muted px-2 py-1 rounded">{section.professorEnrollmentCode}</span>
                      <button type="button" onClick={() => navigator.clipboard.writeText(section.professorEnrollmentCode)} className="ml-1 text-blue-400 hover:underline">
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Student Code:</span>
                      <span className="font-mono text-sm bg-muted px-2 py-1 rounded">{section.studentEnrollmentCode}</span>
                      <button type="button" onClick={() => navigator.clipboard.writeText(section.studentEnrollmentCode)} className="ml-1 text-blue-400 hover:underline">
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
} 