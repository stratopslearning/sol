import { Popover, PopoverContent, PopoverTrigger } from './popover';
import { Checkbox } from './checkbox';
import { Button } from './button';
import { Badge } from './badge';
import { useState } from 'react';

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

export function SectionMultiSelect({ options, value, onChange, placeholder = 'Select sections...' }: SectionMultiSelectProps) {
  const [open, setOpen] = useState(false);

  const handleToggle = (id: string) => {
    if (value.includes(id)) {
      onChange(value.filter(v => v !== id));
    } else {
      onChange([...value, id]);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="w-full flex justify-between items-center min-h-[40px]"
          type="button"
        >
          <span className="flex flex-wrap gap-1">
            {value.length === 0 && <span className="text-white/60">{placeholder}</span>}
            {value.map(id => {
              const section = options.find(o => o.id === id);
              return section ? (
                <Badge key={id} className="bg-blue-700 text-white mr-1">{section.title}</Badge>
              ) : null;
            })}
          </span>
          <span className="ml-2 text-white/60">▼</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-2 bg-[#18181b] border border-white/10 rounded-xl shadow-lg">
        <div className="max-h-60 overflow-y-auto flex flex-col gap-1">
          {options.map(option => (
            <label key={option.id} className="flex items-center gap-2 cursor-pointer px-2 py-1 rounded hover:bg-white/10">
              <Checkbox
                checked={value.includes(option.id)}
                onCheckedChange={() => handleToggle(option.id)}
                className="border-white/30"
              />
              <span className="text-white text-sm">{option.title}</span>
            </label>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
} 