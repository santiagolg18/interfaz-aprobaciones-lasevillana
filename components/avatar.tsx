import { cn } from "@/lib/utils";

function getInitials(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "?";
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function Avatar({
  name,
  tone = "primary",
  size = "md",
  className,
}: {
  name: string;
  tone?: "primary" | "muted";
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const palette =
    tone === "muted"
      ? "bg-neutral-100 text-neutral-600 ring-neutral-200"
      : "bg-primary/10 text-primary ring-primary/15";
  const dim =
    size === "lg"
      ? "size-10 text-sm"
      : size === "sm"
        ? "size-7 text-[10px]"
        : "size-9 text-xs";
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full font-semibold ring-1 ring-inset",
        palette,
        dim,
        className,
      )}
      aria-hidden
    >
      {getInitials(name)}
    </span>
  );
}
