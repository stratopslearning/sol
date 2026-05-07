import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * DataTable — editorial table presentation.
 *
 * This is a presentational wrapper, not a fully featured table primitive.
 * Use it as a container around `<table>` or as a stylistic guide for ad-hoc
 * lists. Columns get hairline rules, header eyebrow caps, hover row tint,
 * and tabular numerals on numeric cells.
 */
interface DataTableProps extends React.HTMLAttributes<HTMLDivElement> {
  /** When true, surface gets the paper card treatment. */
  bordered?: boolean;
}

export function DataTable({
  bordered = true,
  className,
  children,
  ...props
}: DataTableProps) {
  return (
    <div
      className={cn(
        "overflow-x-auto",
        bordered && "rounded-lg border border-rule bg-surface paper-shadow",
        className,
      )}
      {...props}
    >
      <table className="w-full text-sm border-collapse">{children}</table>
    </div>
  );
}

export function THead({
  className,
  ...props
}: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead
      className={cn(
        "border-b border-rule bg-surface-sunken/40",
        className,
      )}
      {...props}
    />
  );
}

export function TBody({
  className,
  ...props
}: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tbody
      className={cn("divide-y divide-rule [&_tr]:transition-colors", className)}
      {...props}
    />
  );
}

export function TR({
  className,
  ...props
}: React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn(
        "hover:bg-surface-sunken/60 data-[state=selected]:bg-brand-soft/40",
        className,
      )}
      {...props}
    />
  );
}

export function TH({
  className,
  numeric,
  ...props
}: React.ThHTMLAttributes<HTMLTableCellElement> & { numeric?: boolean }) {
  return (
    <th
      className={cn(
        "px-4 py-3 font-sans text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-ink-muted",
        numeric ? "text-right tnum" : "text-left",
        className,
      )}
      {...props}
    />
  );
}

export function TD({
  className,
  numeric,
  ...props
}: React.TdHTMLAttributes<HTMLTableCellElement> & { numeric?: boolean }) {
  return (
    <td
      className={cn(
        "px-4 py-3 align-middle text-ink",
        numeric ? "text-right tnum" : "text-left",
        className,
      )}
      {...props}
    />
  );
}
