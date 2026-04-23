import { cn } from "@/lib/utils";

const MAP: Record<string, { label: string; className: string }> = {
  pending: {
    label: "Pendiente",
    className: "bg-amber-100 text-amber-800 ring-amber-200",
  },
  approved: {
    label: "Aprobada",
    className: "bg-emerald-100 text-emerald-800 ring-emerald-200",
  },
  rejected: {
    label: "Rechazada",
    className: "bg-rose-100 text-rose-800 ring-rose-200",
  },
};

export function StatusBadge({
  status,
  className,
}: {
  status: string | null | undefined;
  className?: string;
}) {
  const key = (status ?? "pending").toLowerCase();
  const item = MAP[key] ?? {
    label: status ?? "—",
    className: "bg-neutral-100 text-neutral-700 ring-neutral-200",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
        item.className,
        className,
      )}
    >
      {item.label}
    </span>
  );
}
