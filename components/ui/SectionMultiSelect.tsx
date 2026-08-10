import { ChevronDown } from "lucide-react";
import { useState } from "react";

import { Badge } from "./badge";
import { Button } from "./button";
import { Checkbox } from "./checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { cn } from "@/lib/utils";

interface SectionOption {
  id: string;
  title: string;
}

interface SectionMultiSelectProps {
  options: SectionOption[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
}

export function SectionMultiSelect({
  options,
  value,
  onChange,
  placeholder = "Select sections…",
}: SectionMultiSelectProps) {
  const [open, setOpen] = useState(false);

  const handleToggle = (id: string) => {
    if (value.includes(id)) {
      onChange(value.filter((v) => v !== id));
    } else {
      onChange([...value, id]);
    }
  };

  const selected = value
    .map((id) => options.find((o) => o.id === id))
    .filter(Boolean) as SectionOption[];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn(
            "w-full justify-between gap-2 font-normal",
            // Override button defaults that cause horizontal overflow with many chips.
            "h-auto min-h-10 whitespace-normal py-2",
          )}
        >
          <span className="flex min-w-0 flex-1 flex-wrap items-center gap-1 text-left">
            {selected.length === 0 ? (
              <span className="text-ink-faint">{placeholder}</span>
            ) : (
              selected.map((section) => (
                <Badge
                  key={section.id}
                  variant="info"
                  className="max-w-full truncate font-normal"
                  title={section.title}
                >
                  {section.title}
                </Badge>
              ))
            )}
          </span>
          <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 self-start text-ink-faint" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[var(--radix-popover-trigger-width)] max-w-[min(100vw-2rem,28rem)] p-2"
      >
        <div className="flex max-h-60 flex-col gap-0.5 overflow-y-auto">
          {options.map((option) => (
            <label
              key={option.id}
              className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 transition-colors hover:bg-surface-sunken"
            >
              <Checkbox
                checked={value.includes(option.id)}
                onCheckedChange={() => handleToggle(option.id)}
              />
              <span className="min-w-0 flex-1 truncate text-sm text-ink" title={option.title}>
                {option.title}
              </span>
            </label>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
