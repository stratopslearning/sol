"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

import { cn } from "@/lib/utils";

type TabId = "agent" | "markdown" | "llms";

export function DocsQuickstart({
  agentUrl,
  markdownUrl,
  llmsUrl,
}: {
  agentUrl: string;
  markdownUrl: string;
  llmsUrl: string;
}) {
  const tabs: { id: TabId; label: string; value: string }[] = [
    {
      id: "agent",
      label: "Agent",
      value: `Add SOL faculty tools to my agent: ${agentUrl}`,
    },
    {
      id: "markdown",
      label: "Markdown",
      value: markdownUrl,
    },
    {
      id: "llms",
      label: "llms.txt",
      value: llmsUrl,
    },
  ];

  const [tab, setTab] = useState<TabId>("agent");
  const [copied, setCopied] = useState(false);
  const current = tabs.find((t) => t.id === tab) ?? tabs[0];

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(current.value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard can fail in insecure contexts.
    }
  };

  return (
    <div className="relative mt-10">
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-6 bg-[radial-gradient(60%_80%_at_50%_40%,color-mix(in_oklch,var(--brand)_20%,transparent),transparent)] blur-2xl"
      />
      <div className="relative overflow-hidden rounded-lg border border-rule bg-paper paper-shadow-lg">
        <div className="flex items-center gap-1 border-b border-rule px-2 pt-2">
          {tabs.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={cn(
                "rounded-t-md px-3 py-2 text-xs font-medium transition-colors",
                tab === item.id
                  ? "bg-surface-sunken text-ink"
                  : "text-ink-muted hover:text-ink",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3 px-4 py-3.5">
          <code className="min-w-0 flex-1 truncate font-mono text-[13px] text-ink">
            {current.value}
          </code>
          <button
            type="button"
            onClick={copy}
            aria-label={copied ? "Copied" : "Copy"}
            className="shrink-0 rounded-md p-1.5 text-ink-muted transition-colors hover:bg-surface-sunken hover:text-ink"
          >
            {copied ? (
              <Check className="h-4 w-4 text-success" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
