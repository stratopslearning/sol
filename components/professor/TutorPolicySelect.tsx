"use client";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { TutorAiPolicyMode } from "@/lib/chatbot/aiPolicy";

const OPTIONS: { value: TutorAiPolicyMode; label: string; hint: string }[] = [
  {
    value: "hints",
    label: "Hints only",
    hint: "Small nudges — no full solution walkthroughs before submit.",
  },
  {
    value: "guided",
    label: "Guided",
    hint: "Balance Socratic questions with brief explanations when stuck.",
  },
  {
    value: "full_after_submit",
    label: "Full help after submit",
    hint: "Stay strict until the related quiz is submitted, then explain more.",
  },
];

export function TutorPolicySelect({
  id = "tutor-policy",
  value,
  onChange,
  disabled,
  inheritLabel,
}: {
  id?: string;
  value: TutorAiPolicyMode | "inherit";
  onChange: (mode: TutorAiPolicyMode | "inherit") => void;
  disabled?: boolean;
  inheritLabel?: string;
}) {
  const selected = OPTIONS.find((o) => o.value === value);

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>Tutor AI policy</Label>
      <Select
        value={value}
        onValueChange={(v) =>
          onChange(v as TutorAiPolicyMode | "inherit")
        }
        disabled={disabled}
      >
        <SelectTrigger id={id}>
          <SelectValue placeholder="Choose policy" />
        </SelectTrigger>
        <SelectContent>
          {inheritLabel ? (
            <SelectItem value="inherit">{inheritLabel}</SelectItem>
          ) : null}
          {OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground">
        {value === "inherit"
          ? "Uses the course default when set."
          : selected?.hint}
      </p>
    </div>
  );
}
