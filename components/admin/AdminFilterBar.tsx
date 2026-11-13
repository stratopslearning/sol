'use client';

import type { ReactNode } from 'react';
import { Search } from '@/components/icons';

import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

export type AdminFilterOption = { value: string; label: string };

type Props = {
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  /** First select (e.g. type). Pass null to hide. */
  filterValue?: string;
  onFilterChange?: (value: string) => void;
  filterOptions?: AdminFilterOption[];
  filterLabel?: string;
  /** Second select (e.g. billing). */
  secondaryValue?: string;
  onSecondaryChange?: (value: string) => void;
  secondaryOptions?: AdminFilterOption[];
  secondaryLabel?: string;
  className?: string;
  trailing?: ReactNode;
};

/**
 * Lightweight list filter bar for admin directory pages.
 * Client-side filtering is expected for local/dev scale.
 */
export function AdminFilterBar({
  search,
  onSearchChange,
  searchPlaceholder = 'Search…',
  filterValue,
  onFilterChange,
  filterOptions,
  filterLabel = 'Filter',
  secondaryValue,
  onSecondaryChange,
  secondaryOptions,
  secondaryLabel = 'Status',
  className,
  trailing,
}: Props) {
  return (
    <div
      className={cn(
        'flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center',
        className,
      )}
    >
      <label className="relative min-w-[12rem] flex-1 sm:max-w-xs">
        <Search
          className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-faint"
          aria-hidden
        />
        <Input
          type="search"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={searchPlaceholder}
          className="pl-8"
          aria-label={searchPlaceholder}
        />
      </label>
      {filterOptions && onFilterChange && filterValue !== undefined ? (
        <Select value={filterValue} onValueChange={onFilterChange}>
          <SelectTrigger className="w-full sm:w-[11rem]" aria-label={filterLabel}>
            <SelectValue placeholder={filterLabel} />
          </SelectTrigger>
          <SelectContent>
            {filterOptions.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : null}
      {secondaryOptions && onSecondaryChange && secondaryValue !== undefined ? (
        <Select value={secondaryValue} onValueChange={onSecondaryChange}>
          <SelectTrigger
            className="w-full sm:w-[11rem]"
            aria-label={secondaryLabel}
          >
            <SelectValue placeholder={secondaryLabel} />
          </SelectTrigger>
          <SelectContent>
            {secondaryOptions.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : null}
      {trailing ? <div className="sm:ml-auto">{trailing}</div> : null}
    </div>
  );
}
