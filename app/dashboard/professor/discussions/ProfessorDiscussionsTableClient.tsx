"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { MessagesSquare } from "lucide-react";
import { toast } from "sonner";

import { EmptyState } from "@/components/patterns/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { apiUrl, appPath } from "@/lib/basePath";

type Row = {
  id: string;
  title: string;
  personaName: string;
  isTemplate: boolean;
  relatedQuizTitle: string | null;
  sectionNames: string[];
  isActive: boolean;
};

export default function ProfessorDiscussionsTableClient({
  discussions,
}: {
  discussions: Row[];
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [duplicating, setDuplicating] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return discussions.filter(
      (d) =>
        !search ||
        d.title.toLowerCase().includes(search.toLowerCase()) ||
        d.personaName.toLowerCase().includes(search.toLowerCase()),
    );
  }, [discussions, search]);

  async function duplicate(id: string) {
    setDuplicating(id);
    try {
      const res = await fetch(
        apiUrl(`/api/professor/chatbot/${id}/duplicate`),
        { method: "POST" },
      );
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Duplicate failed");
        return;
      }
      toast.success("Discussion duplicated");
      router.push(appPath(`/dashboard/professor/discussions/${data.chatbot.id}/edit`));
      router.refresh();
    } catch {
      toast.error("Duplicate failed");
    } finally {
      setDuplicating(null);
    }
  }

  if (discussions.length === 0) {
    return (
      <EmptyState
        icon={<MessagesSquare className="h-5 w-5" />}
        eyebrow="Discussions"
        title="No discussions yet."
        description="Create a chapter discussion or duplicate the Chapter 1 template."
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Input
        placeholder="Search discussions…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="md:max-w-sm"
      />
      <div className="paper paper-shadow overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Discussion</TableHead>
              <TableHead>Persona</TableHead>
              <TableHead>Sections</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((d) => (
              <TableRow key={d.id}>
                <TableCell>
                  <div className="font-medium">{d.title}</div>
                  {d.relatedQuizTitle ? (
                    <div className="text-sm text-ink-muted">
                      Quiz: {d.relatedQuizTitle}
                    </div>
                  ) : null}
                </TableCell>
                <TableCell>{d.personaName}</TableCell>
                <TableCell className="text-ink-muted">
                  {d.sectionNames.join(", ") || "—"}
                </TableCell>
                <TableCell>
                  {d.isTemplate ? (
                    <Badge variant="outline">Template</Badge>
                  ) : (
                    <Badge variant="success">Yours</Badge>
                  )}
                </TableCell>
                <TableCell className="text-right space-x-2">
                  {d.isTemplate ? (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={duplicating === d.id}
                      onClick={() => void duplicate(d.id)}
                    >
                      Duplicate
                    </Button>
                  ) : (
                    <>
                      <Button asChild size="sm" variant="outline">
                        <Link
                          href={appPath(
                            `/dashboard/professor/discussions/${d.id}`,
                          )}
                        >
                          Sessions
                        </Link>
                      </Button>
                      <Button asChild size="sm" variant="outline">
                        <Link
                          href={appPath(
                            `/dashboard/professor/discussions/${d.id}/edit`,
                          )}
                        >
                          Edit
                        </Link>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={duplicating === d.id}
                        onClick={() => void duplicate(d.id)}
                      >
                        Duplicate
                      </Button>
                    </>
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
