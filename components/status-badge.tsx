import {
  AlertTriangle,
  Archive,
  CheckCheck,
  CheckCircle2,
  Clock,
  Hourglass,
  MinusCircle,
  Search,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

type StatusKey =
  | "pending"
  | "approved"
  | "rejected"
  | "in_review"
  | "review_rejected"
  | "blocked"
  | "archived"
  | "completed";

const MAP: Record<
  StatusKey,
  { label: string; className: string; icon: React.ComponentType<{ className?: string }> }
> = {
  in_review: {
    label: "En revisión",
    className: "bg-sky-50 text-sky-800 ring-sky-200",
    icon: Search,
  },
  review_rejected: {
    label: "Rechazada en revisión",
    className: "bg-orange-50 text-orange-800 ring-orange-200",
    icon: AlertTriangle,
  },
  blocked: {
    label: "En espera",
    className: "bg-neutral-100 text-neutral-600 ring-neutral-200",
    icon: Hourglass,
  },
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
  completed: {
    label: "Completada",
    className: "bg-teal-50 text-teal-800 ring-teal-200",
    icon: CheckCheck,
  },
  rejected: {
    label: "Rechazada",
    className: "bg-rose-50 text-rose-800 ring-rose-200",
    icon: XCircle,
  },
  archived: {
    label: "Archivada",
    className: "bg-slate-100 text-slate-600 ring-slate-200",
    icon: Archive,
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
