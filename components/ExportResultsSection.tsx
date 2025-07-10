"use client";
import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function ExportResultsSection({ quizzes }: { quizzes: { id: string; title: string }[] }) {
  const [quizId, setQuizId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [downloading, setDownloading] = useState(false);

  const handleExport = async () => {
    setDownloading(true);
    const params = new URLSearchParams();
    if (quizId && quizId !== 'all') params.append('quizId', quizId);
    if (dateFrom) params.append('dateFrom', dateFrom);
    if (dateTo) params.append('dateTo', dateTo);
    const res = await fetch(`/api/professor/quiz/export?${params.toString()}`);
    if (res.ok) {
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'quiz_results.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } else {
      alert('Failed to export results');
    }
    setDownloading(false);
  };

  return (
    <Card className="mb-8 bg-white/10 border border-white/10">
      <CardHeader>
        <CardTitle className="text-lg text-white">Export Quiz Results</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1">
            <label className="block text-white/80 mb-1">Quiz</label>
            <Select value={quizId} onValueChange={setQuizId}>
              <SelectTrigger className="bg-white/5 border-white/20 text-white">
                <SelectValue placeholder="All Quizzes" />
              </SelectTrigger>
              <SelectContent className="bg-white/10 border-white/20">
                <SelectItem value="all">All Quizzes</SelectItem>
                {quizzes.map((q: { id: string; title: string }) => (
                  <SelectItem key={q.id} value={q.id}>{q.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-white/80 mb-1">From</label>
            <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="bg-white/5 border-white/20 text-white" />
          </div>
          <div>
            <label className="block text-white/80 mb-1">To</label>
            <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="bg-white/5 border-white/20 text-white" />
          </div>
          <Button onClick={handleExport} disabled={downloading} className="h-12 mt-4 md:mt-0">
            {downloading ? 'Exporting...' : 'Export Results as CSV'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
} 