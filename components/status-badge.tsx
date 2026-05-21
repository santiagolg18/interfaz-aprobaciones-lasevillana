import { CheckCircle2, Clock, MinusCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type StatusKey = "pending" | "approved" | "rejected";

const MAP: Record<
  StatusKey,
  { label: string; className: string; icon: React.ComponentType<{ className?: string }> }
> = {
  pending: {
    label: "Pendiente",
    className: "bg-amber-50 text-amber-800 ring-amber-200",
    icon: Clock,
  },
  approved: {
    label: "Aprobada",
    className: "bg-emerald-50 text-emerald-800 ring-emerald-200",
    icon: CheckCircle2,
  },
  rejected: {
    label: "Rechazada",
    className: "bg-rose-50 text-rose-800 ring-rose-200",
    icon: XCircle,
  },
};

export function StatusBadge({
  status,
  size = "sm",
  className,
}: {
  status: string | null | undefined;
  size?: "sm" | "md";
  className?: string;
}) {
  const key = (status ?? "pending").toLowerCase() as StatusKey;
  const item = MAP[key] ?? {
    label: status ?? "—",
    className: "bg-neutral-50 text-neutral-700 ring-neutral-200",
    icon: MinusCircle,
  };
  const Icon = item.icon;
  const sizeClass =
    size === "md"
      ? "px-3 py-1 text-sm gap-1.5 [&_svg]:size-3.5"
      : "px-2.5 py-0.5 text-xs gap-1 [&_svg]:size-3";
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full font-medium ring-1 ring-inset whitespace-nowrap",
        sizeClass,
        item.className,
        className,
      )}
    >
      <Icon className="shrink-0" />
      {item.label}
    </span>
  );
}
