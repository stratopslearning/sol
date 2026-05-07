import { ChevronDown } from "lucide-react";
import { useState } from "react";

import { Badge } from "./badge";
import { Button } from "./button";
import { Checkbox } from "./checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";

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

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="w-full justify-between min-h-[40px] font-normal"
        >
          <span className="flex flex-wrap gap-1 items-center">
            {value.length === 0 && (
              <span className="text-ink-faint">{placeholder}</span>
            )}
            {value.map((id) => {
              const section = options.find((o) => o.id === id);
              return section ? (
                <Badge key={id} variant="info">
                  {section.title}
                </Badge>
              ) : null;
            })}
          </span>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 text-ink-faint" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-2">
        <div className="max-h-60 overflow-y-auto flex flex-col gap-0.5">
          {options.map((option) => (
            <label
              key={option.id}
              className="flex items-center gap-2 cursor-pointer px-2 py-1.5 rounded-sm hover:bg-surface-sunken transition-colors"
            >
              <Checkbox
                checked={value.includes(option.id)}
                onCheckedChange={() => handleToggle(option.id)}
              />
              <span className="text-ink text-sm">{option.title}</span>
            </label>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
