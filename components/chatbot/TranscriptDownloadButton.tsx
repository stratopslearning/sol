"use client";

import { Button } from "@/components/ui/button";

type Msg = { role: "user" | "assistant"; content: string };

export function TranscriptDownloadButton({
  title,
  personaName,
  studentName,
  messages,
}: {
  title: string;
  personaName: string;
  studentName: string;
  messages: Msg[];
}) {
  function download() {
    const lines = [
      `${title} Conversation`,
      `Student: ${studentName}`,
      "",
      ...messages.map((m) =>
        m.role === "user"
          ? `${studentName}: ${m.content}`
          : `${personaName}: ${m.content}`,
      ),
    ];
    const blob = new Blob([lines.join("\n\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title.replace(/\s+/g, "_")}_transcript.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Button variant="outline" onClick={download} disabled={messages.length === 0}>
      Download transcript
    </Button>
  );
}
