import { cn } from "@/lib/utils";

export function ApprovalProgress({
  current,
  required,
  status,
  size = "sm",
  className,
}: {
  current: number;
  required: number;
  status?: string | null;
  size?: "sm" | "md";
  className?: string;
}) {
  const safeRequired = Math.max(required, 1);
  const safeCurrent = Math.max(0, Math.min(current, safeRequired));
  const pct = (safeCurrent / safeRequired) * 100;
  const isRejected = (status ?? "").toLowerCase() === "rejected";
  const isComplete = safeCurrent >= safeRequired;

  const barColor = isRejected
    ? "bg-rose-500"
    : isComplete
      ? "bg-emerald-500"
      : "bg-primary";
  const trackColor = "bg-neutral-200/80";
  const textColor = isRejected
    ? "text-rose-700"
    : isComplete
      ? "text-emerald-700"
      : "text-neutral-700";

  const trackHeight = size === "md" ? "h-1.5" : "h-1";
  const trackWidth = size === "md" ? "w-20" : "w-14";
  const textSize = size === "md" ? "text-sm" : "text-xs";

  return (
    <div
      className={cn("inline-flex items-center gap-2 tabular-nums", className)}
      aria-label={`Aprobaciones: ${safeCurrent} de ${safeRequired}`}
    >
      <div
        className={cn(
          "overflow-hidden rounded-full",
          trackColor,
          trackHeight,
          trackWidth,
        )}
      >
        <div
          className={cn("h-full rounded-full transition-all", barColor)}
          style={{ width: `${isRejected ? 100 : pct}%` }}
        />
      </div>
      <span className={cn("font-medium leading-none", textSize, textColor)}>
        {safeCurrent}/{safeRequired}
      </span>
    </div>
  );
}
