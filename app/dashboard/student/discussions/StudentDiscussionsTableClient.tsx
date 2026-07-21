"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { MessagesSquare } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/patterns/EmptyState";
import { appPath } from "@/lib/basePath";

type DiscussionRow = {
  id: string;
  title: string;
  personaName: string;
  relatedQuizTitle: string | null;
  learningMode: boolean;
  sectionNames: string[];
  status: "open" | "in_progress" | "completed";
  latestSessionId: string | null;
};

export default function StudentDiscussionsTableClient({
  discussions,
}: {
  discussions: DiscussionRow[];
}) {
  const [search, setSearch] = useState("");
  const [sectionFilter, setSectionFilter] = useState("ALL");

  const sections = useMemo(() => {
    const seen = new Set<string>();
    return discussions
      .flatMap((d) => d.sectionNames)
      .filter((name) => {
        if (!name || seen.has(name)) return false;
        seen.add(name);
        return true;
      })
      .sort();
  }, [discussions]);

  const filtered = useMemo(() => {
    return discussions.filter((d) => {
      const matchesSearch =
        !search ||
        d.title.toLowerCase().includes(search.toLowerCase()) ||
        d.personaName.toLowerCase().includes(search.toLowerCase());
      const matchesSection =
        sectionFilter === "ALL" || d.sectionNames.includes(sectionFilter);
      return matchesSearch && matchesSection;
    });
  }, [discussions, search, sectionFilter]);

  if (discussions.length === 0) {
    return (
      <EmptyState
        icon={<MessagesSquare className="h-5 w-5" />}
        eyebrow="Nothing assigned"
        title="No discussions yet."
        description="When your professor assigns a chapter or quiz discussion, it will appear here."
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center">
        <div className="md:w-56">
          <Select value={sectionFilter} onValueChange={setSectionFilter}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="All sections" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All sections</SelectItem>
              {sections.map((name) => (
                <SelectItem key={name} value={name}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Input
          placeholder="Search discussions…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="md:max-w-sm"
        />
      </div>

      <div className="paper paper-shadow overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Discussion</TableHead>
              <TableHead>Persona</TableHead>
              <TableHead>Sections</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right sticky right-0 bg-paper">
                Action
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((d) => (
              <TableRow key={d.id}>
                <TableCell>
                  <div className="font-medium text-ink">{d.title}</div>
                  {d.learningMode && d.relatedQuizTitle ? (
                    <div className="text-sm text-ink-muted mt-0.5">
                      Linked quiz: {d.relatedQuizTitle}
                    </div>
                  ) : null}
                </TableCell>
                <TableCell>{d.personaName}</TableCell>
                <TableCell className="text-ink-muted">
                  {d.sectionNames.join(", ") || "—"}
                </TableCell>
                <TableCell>
                  {d.status === "completed" ? (
                    <Badge variant="info">Completed</Badge>
                  ) : d.status === "in_progress" ? (
                    <Badge variant="warning">In progress</Badge>
                  ) : (
                    <Badge variant="outline">Open</Badge>
                  )}
                  {d.learningMode ? (
                    <Badge variant="outline" className="ml-2">
                      Learning mode
                    </Badge>
                  ) : null}
                </TableCell>
                <TableCell className="text-right sticky right-0 bg-paper">
                  {d.status === "completed" && d.latestSessionId ? (
                    <Button asChild size="sm" variant="outline">
                      <Link
                        href={appPath(
                          `/chatbot/${d.id}?sessionId=${d.latestSessionId}`,
                        )}
                      >
                        Review
                      </Link>
                    </Button>
                  ) : (
                    <Button asChild size="sm">
                      <Link href={appPath(`/chatbot/${d.id}`)}>
                        {d.status === "in_progress" ? "Continue" : "Start"}
                      </Link>
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
