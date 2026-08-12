"use client";

import { Download } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiUrl } from "@/lib/basePath";

export default function ExportResultsSection({
  quizzes,
}: {
  quizzes: { id: string; title: string }[];
}) {
  const [quizId, setQuizId] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const handleExport = async () => {
    if (!acknowledged) return;
    setDownloading(true);
    const params = new URLSearchParams();
    if (quizId && quizId !== "all") params.append("quizId", quizId);
    if (dateFrom) params.append("dateFrom", dateFrom);
    if (dateTo) params.append("dateTo", dateTo);
    const res = await fetch(
      apiUrl(`/api/professor/quiz/export?${params.toString()}`),
    );
    if (res.ok) {
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "quiz_results.csv";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } else {
      alert("Failed to export results");
    }
    setDownloading(false);
  };

  return (
    <section className="paper paper-shadow p-6 mb-8">
      <header>
        <span className="eyebrow text-ink-faint">Export</span>
        <h2 className="font-display text-lg text-ink mt-1">Quiz results</h2>
        <p className="mt-1 text-sm text-ink-muted">
          Download attempts as a CSV. Filter by quiz or date range.
        </p>
      </header>

      <div
        className="mt-5 rounded-md border border-rule bg-[color-mix(in_oklch,var(--surface-sunken)_65%,transparent)] px-4 py-3 text-sm leading-relaxed text-ink-muted"
        role="note"
      >
        <p className="font-medium text-ink">FERPA / restricted data</p>
        <p className="mt-1">
          This export can include student names, emails, and grades — education
          records. Store the file encrypted or on institution-approved storage,
          do not email it in plaintext, and delete it when you no longer need
          it.
        </p>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2 sm:col-span-2">
          <Label htmlFor="export-quiz">Quiz</Label>
          <Select value={quizId || "all"} onValueChange={setQuizId}>
            <SelectTrigger id="export-quiz">
              <SelectValue placeholder="All quizzes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All quizzes</SelectItem>
              {quizzes.map((q) => (
                <SelectItem key={q.id} value={q.id}>
                  {q.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="export-from">From</Label>
          <Input
            id="export-from"
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="export-to">To</Label>
          <Input
            id="export-to"
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
        </div>
        <div className="flex items-start gap-3 sm:col-span-2">
          <Checkbox
            id="export-ferpa-ack"
            checked={acknowledged}
            onCheckedChange={(value) => setAcknowledged(value === true)}
          />
          <Label
            htmlFor="export-ferpa-ack"
            className="text-sm font-normal leading-relaxed text-ink-muted"
          >
            I will handle this download as restricted education-record data
            (secure storage, no plaintext email, delete when done).
          </Label>
        </div>
        <div className="sm:col-span-2">
          <Button
            onClick={handleExport}
            disabled={!acknowledged || downloading}
            loading={downloading}
            className="w-full"
          >
            <Download className="h-4 w-4" />
            {downloading ? "Exporting…" : "Export CSV"}
          </Button>
        </div>
      </div>
    </section>
  );
}
