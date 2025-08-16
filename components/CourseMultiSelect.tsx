"use client";
import * as React from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandInput, CommandList, CommandItem, CommandEmpty } from "@/components/ui/command";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, ChevronDown } from "lucide-react";

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

export default function CourseMultiSelect({ value, onChange, options, placeholder }: CourseMultiSelectProps) {
  const [open, setOpen] = React.useState(false);
  const selectedCourses = options.filter(opt => value.includes(opt.id));

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between bg-white/5 border-white/20 text-white"
        >
          {selectedCourses.length > 0
            ? (
              <span className="flex flex-wrap gap-1">
                {selectedCourses.map(c => (
                  <Badge key={c.id} className="bg-blue-600/20 text-blue-400 border-blue-600">{c.title}</Badge>
                ))}
              </span>
            )
            : <span className="text-white/40">{placeholder || "Select courses..."}</span>}
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-0 bg-white/10 border-white/20">
        <Command>
          <CommandInput placeholder="Search courses..." className="bg-white/5 text-white" />
          <CommandList>
            {options.length === 0 && <CommandEmpty>No courses found.</CommandEmpty>}
            {options.map(option => (
              <CommandItem
                key={option.id}
                onSelect={() => {
                  if (value.includes(option.id)) {
                    onChange(value.filter(v => v !== option.id));
                  } else {
                    onChange([...value, option.id]);
                  }
                }}
                className="flex items-center gap-2 cursor-pointer"
              >
                <Checkbox checked={value.includes(option.id)} tabIndex={-1} className="mr-2" />
                {option.title}
                {value.includes(option.id) && <Check className="ml-auto h-4 w-4 text-blue-400" />}
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
} 