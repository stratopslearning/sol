"use client";

import { useMemo, useState } from "react";

import type { InteractiveBody, InteractiveKind } from "@/app/db/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Props = {
  kind: InteractiveKind;
  body: InteractiveBody;
  title: string;
  completed: boolean;
  onComplete: (summary?: Record<string, unknown>) => Promise<void>;
  onStart?: () => Promise<void>;
};

function parseFillBlanks(text: string) {
  const parts: Array<{ type: "text" | "blank"; value: string; index?: number }> =
    [];
  const re = /\{\{([^}]+)\}\}/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let blankIndex = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) {
      parts.push({ type: "text", value: text.slice(last, m.index) });
    }
    parts.push({ type: "blank", value: m[1]!.trim(), index: blankIndex++ });
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push({ type: "text", value: text.slice(last) });
  return parts;
}

export function InteractivePlayer({
  kind,
  body,
  title,
  completed,
  onComplete,
  onStart,
}: Props) {
  const [busy, setBusy] = useState(false);
  const [checked, setChecked] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [openPanels, setOpenPanels] = useState<Set<string>>(new Set());
  const [revealedHotspots, setRevealedHotspots] = useState<Set<string>>(
    new Set(),
  );
  const [dragSlots, setDragSlots] = useState<Record<number, string>>({});

  const blanks = useMemo(
    () => parseFillBlanks(body.text ?? ""),
    [body.text],
  );

  async function markStarted() {
    if (onStart) await onStart();
  }

  async function finish(summary?: Record<string, unknown>) {
    setBusy(true);
    try {
      await onComplete(summary);
    } finally {
      setBusy(false);
    }
  }

  if (kind === "H5P_PACKAGE") {
    return (
      <div className="space-y-4">
        <p className="text-sm text-ink-muted">
          H5P package: {body.packageFileName ?? "interactive.h5p"}
        </p>
        <div
          id="h5p-container"
          className="min-h-[24rem] rounded-xl border border-rule bg-surface-sunken p-4 text-sm text-ink-muted"
        >
          Open the package player below. When you finish, mark complete.
        </div>
        <H5pEmbedNote />
        {!completed ? (
          <Button
            disabled={busy}
            onClick={() => finish({ source: "h5p_manual" })}
          >
            Mark complete
          </Button>
        ) : (
          <p className="text-sm text-brand">Completed</p>
        )}
      </div>
    );
  }

  if (kind === "ACCORDION") {
    const panels = body.panels ?? [];
    return (
      <div className="space-y-3" onFocusCapture={() => void markStarted()}>
        {panels.map((panel) => {
          const open = openPanels.has(panel.id);
          return (
            <div
              key={panel.id}
              className="rounded-xl border border-rule bg-surface overflow-hidden"
            >
              <button
                type="button"
                className="w-full px-4 py-3 text-left font-display text-ink"
                onClick={() => {
                  void markStarted();
                  setOpenPanels((prev) => {
                    const next = new Set(prev);
                    if (next.has(panel.id)) next.delete(panel.id);
                    else next.add(panel.id);
                    return next;
                  });
                }}
              >
                {panel.title}
              </button>
              {open ? (
                <div className="border-t border-rule px-4 py-3 text-sm text-ink-muted whitespace-pre-wrap">
                  {panel.body}
                </div>
              ) : null}
            </div>
          );
        })}
        {!completed ? (
          <Button
            disabled={busy || openPanels.size === 0}
            onClick={() =>
              finish({ panelsOpened: openPanels.size, total: panels.length })
            }
          >
            Mark complete
          </Button>
        ) : (
          <p className="text-sm text-brand">Completed</p>
        )}
      </div>
    );
  }

  if (kind === "IMAGE_HOTSPOTS") {
    const spots = body.hotspots ?? [];
    return (
      <div className="space-y-4" onPointerDown={() => void markStarted()}>
        <div className="relative overflow-hidden rounded-xl border border-rule bg-surface-sunken aspect-[4/3]">
          {body.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={body.imageUrl}
              alt={title}
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-ink-faint">
              Image hotspots (add an image URL in the editor)
            </div>
          )}
          {spots.map((spot) => (
            <button
              key={spot.id}
              type="button"
              className={cn(
                "absolute h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-paper bg-brand text-[0.65rem] text-paper",
                revealedHotspots.has(spot.id) && "ring-2 ring-brand/40",
              )}
              style={{ left: `${spot.xPercent}%`, top: `${spot.yPercent}%` }}
              title={spot.label}
              onClick={() => {
                void markStarted();
                setRevealedHotspots((prev) => new Set(prev).add(spot.id));
              }}
            >
              i
            </button>
          ))}
        </div>
        {spots
          .filter((s) => revealedHotspots.has(s.id))
          .map((s) => (
            <div
              key={s.id}
              className="rounded-lg border border-rule bg-surface px-3 py-2 text-sm"
            >
              <p className="font-medium text-ink">{s.label}</p>
              <p className="text-ink-muted mt-1">{s.content}</p>
            </div>
          ))}
        {!completed ? (
          <Button
            disabled={busy || revealedHotspots.size === 0}
            onClick={() =>
              finish({
                revealed: revealedHotspots.size,
                total: spots.length,
              })
            }
          >
            Mark complete
          </Button>
        ) : (
          <p className="text-sm text-brand">Completed</p>
        )}
      </div>
    );
  }

  if (kind === "DRAG_WORDS") {
    const words = body.words ?? [];
    const pool = [...words, ...(body.distractors ?? [])];
    const slots = (body.sentence ?? "").split(/\{\{[^}]+\}\}/);
    const slotCount = Math.max(0, slots.length - 1);

    return (
      <div className="space-y-4" onPointerDown={() => void markStarted()}>
        <p className="font-display text-lg text-ink leading-relaxed">
          {slots.map((chunk, i) => (
            <span key={i}>
              {chunk}
              {i < slotCount ? (
                <select
                  className="mx-1 inline-block rounded border border-rule bg-surface px-2 py-1 text-sm"
                  value={dragSlots[i] ?? ""}
                  onChange={(e) =>
                    setDragSlots((prev) => ({ ...prev, [i]: e.target.value }))
                  }
                >
                  <option value="">Choose…</option>
                  {pool.map((w) => (
                    <option key={`${i}-${w}`} value={w}>
                      {w}
                    </option>
                  ))}
                </select>
              ) : null}
            </span>
          ))}
        </p>
        {checked ? (
          <p className="text-sm text-ink-muted">
            Local check only. Not a gradebook score.
          </p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setChecked(true)}
          >
            Check answers
          </Button>
          {!completed ? (
            <Button
              disabled={busy}
              onClick={() => finish({ slots: dragSlots, checked })}
            >
              Mark complete
            </Button>
          ) : (
            <p className="text-sm text-brand self-center">Completed</p>
          )}
        </div>
      </div>
    );
  }

  // FILL_BLANKS default
  return (
    <div className="space-y-4" onFocusCapture={() => void markStarted()}>
      <p className="font-display text-lg text-ink leading-relaxed">
        {blanks.map((part, i) =>
          part.type === "text" ? (
            <span key={i}>{part.value}</span>
          ) : (
            <Input
              key={i}
              className="mx-1 inline-flex h-8 w-28 align-baseline"
              value={answers[String(part.index)] ?? ""}
              onChange={(e) =>
                setAnswers((prev) => ({
                  ...prev,
                  [String(part.index)]: e.target.value,
                }))
              }
              aria-label={`Blank ${(part.index ?? 0) + 1}`}
            />
          ),
        )}
      </p>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={() => setChecked(true)}>
          Check answers
        </Button>
        {!completed ? (
          <Button
            disabled={busy}
            onClick={() => finish({ answers, checked })}
          >
            Mark complete
          </Button>
        ) : (
          <p className="text-sm text-brand self-center">Completed</p>
        )}
      </div>
      {checked ? (
        <p className="text-sm text-ink-muted">
          Local check only. Not recorded as a numeric grade.
        </p>
      ) : null}
    </div>
  );
}

function H5pEmbedNote() {
  return (
    <p className="text-xs text-ink-faint">
      Package playback uses the browser H5P runtime when available. Completion can
      also be marked manually after you finish the activity.
    </p>
  );
}
