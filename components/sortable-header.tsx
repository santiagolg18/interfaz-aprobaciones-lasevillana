import Link from "next/link";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

type Direction = "asc" | "desc";

type Props = {
  label: string;
  field: string;
  currentSort: string;
  searchParams: Record<string, string | undefined>;
  pathname: string;
  align?: "left" | "right";
  defaultDirection?: Direction;
};

function parseSort(value: string): { field: string; direction: Direction } | null {
  if (!value) return null;
  const m = value.match(/^(.+)_(asc|desc)$/);
  if (!m) return null;
  return { field: m[1], direction: m[2] as Direction };
}

function buildHref(
  pathname: string,
  searchParams: Record<string, string | undefined>,
  nextSort: string | null,
) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(searchParams)) {
    if (v && k !== "sort" && k !== "page") params.set(k, v);
  }
  if (nextSort) params.set("sort", nextSort);
  const qs = params.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

export function SortableHeader({
  label,
  field,
  currentSort,
  searchParams,
  pathname,
  align = "left",
  defaultDirection = "desc",
}: Props) {
  const parsed = parseSort(currentSort);
  const isActive = parsed?.field === field;
  const direction = isActive ? parsed!.direction : null;
  const nextDirection: Direction = !isActive
    ? defaultDirection
    : direction === "asc"
      ? "desc"
      : "asc";
  const nextSort = `${field}_${nextDirection}`;

  const Icon = !isActive
    ? ArrowUpDown
    : direction === "asc"
      ? ArrowUp
      : ArrowDown;

  return (
    <Link
      href={buildHref(pathname, searchParams, nextSort)}
      scroll={false}
      className={cn(
        "group inline-flex items-center gap-1 rounded-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2",
        align === "right" && "flex-row-reverse",
        isActive ? "text-neutral-900" : "text-muted-foreground hover:text-neutral-900",
      )}
      aria-sort={isActive ? (direction === "asc" ? "ascending" : "descending") : "none"}
    >
      <span>{label}</span>
      <Icon
        className={cn(
          "size-3.5 shrink-0 transition-opacity",
          isActive ? "opacity-100" : "opacity-40 group-hover:opacity-80",
        )}
      />
    </Link>
  );
}
