"use client";

import { Check, ChevronDown } from "lucide-react";
import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface CourseOption {
  id: string;
  title: string;
}

interface CourseMultiSelectProps {
  value: string[];
  onChange: (value: string[]) => void;
  options: CourseOption[];
  placeholder?: string;
}

export default function CourseMultiSelect({
  value,
  onChange,
  options,
  placeholder,
}: CourseMultiSelectProps) {
  const [open, setOpen] = React.useState(false);
  const selectedCourses = options.filter((opt) => value.includes(opt.id));

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          {selectedCourses.length > 0 ? (
            <span className="flex flex-wrap gap-1">
              {selectedCourses.map((c) => (
                <Badge key={c.id} variant="info">
                  {c.title}
                </Badge>
              ))}
            </span>
          ) : (
            <span className="text-ink-faint">
              {placeholder || "Select courses…"}
            </span>
          )}
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 text-ink-faint" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-0">
        <Command>
          <CommandInput placeholder="Search courses…" />
          <CommandList>
            {options.length === 0 && <CommandEmpty>No courses found.</CommandEmpty>}
            {options.map((option) => (
              <CommandItem
                key={option.id}
                onSelect={() => {
                  if (value.includes(option.id)) {
                    onChange(value.filter((v) => v !== option.id));
                  } else {
                    onChange([...value, option.id]);
                  }
                }}
                className="flex items-center gap-2 cursor-pointer"
              >
                <Checkbox
                  checked={value.includes(option.id)}
                  tabIndex={-1}
                  className="mr-2"
                />
                {option.title}
                {value.includes(option.id) && (
                  <Check className="ml-auto h-4 w-4 text-brand" />
                )}
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
