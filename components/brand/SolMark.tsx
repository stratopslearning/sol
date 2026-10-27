import { SOL_MARK_PATH, SOL_MARK_VIEWBOX } from "@/lib/brand/solMark";
import { cn } from "@/lib/utils";

type SolMarkProps = {
  className?: string;
  title?: string;
};

/** Organic SOL sun emblem: fill follows `currentColor`. */
export function SolMark({ className, title = "SOL" }: SolMarkProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={SOL_MARK_VIEWBOX}
      role="img"
      aria-label={title}
      className={cn("shrink-0 text-ink", className)}
    >
      <title>{title}</title>
      <path fill="currentColor" fillRule="evenodd" d={SOL_MARK_PATH} />
    </svg>
  );
}
