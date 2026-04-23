import { formatCOP } from "@/lib/format";
import { cn } from "@/lib/utils";

export function Money({
  value,
  className,
}: {
  value: number | string | null | undefined;
  className?: string;
}) {
  return (
    <span className={cn("tabular-nums font-medium", className)}>
      {formatCOP(value)}
    </span>
  );
}
