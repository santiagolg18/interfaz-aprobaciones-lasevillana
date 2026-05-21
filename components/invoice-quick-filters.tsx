import Link from "next/link";
import { cn } from "@/lib/utils";

type Counts = {
  all: number;
  pending: number;
  approved: number;
  rejected: number;
  noPo: number;
  aging: number;
  recent: number;
};

type QuickKey =
  | "all"
  | "pending"
  | "no_po"
  | "aging"
  | "recent"
  | "approved"
  | "rejected";

type ActiveProps = {
  status?: string;
  quick?: string;
  po?: string;
};

function detectActive({ status, quick, po }: ActiveProps): QuickKey {
  if (quick === "aging") return "aging";
  if (quick === "recent") return "recent";
  if (po === "without" && !status) return "no_po";
  if (status === "pending") return "pending";
  if (status === "approved") return "approved";
  if (status === "rejected") return "rejected";
  return "all";
}

function hrefFor(
  key: QuickKey,
  base: Record<string, string | undefined>,
): string {
  const params = new URLSearchParams();
  // Mantener filtros agnósticos al quick filter (proveedor, fechas, búsqueda, etc.)
  const preserve = ["supplier_id", "from", "to", "q", "min", "max", "sort"];
  for (const k of preserve) {
    const v = base[k];
    if (v) params.set(k, v);
  }
  switch (key) {
    case "pending":
      params.set("status", "pending");
      break;
    case "approved":
      params.set("status", "approved");
      break;
    case "rejected":
      params.set("status", "rejected");
      break;
    case "no_po":
      params.set("po", "without");
      break;
    case "aging":
      params.set("quick", "aging");
      break;
    case "recent":
      params.set("quick", "recent");
      break;
    case "all":
    default:
      break;
  }
  const qs = params.toString();
  return qs ? `/facturas?${qs}` : "/facturas";
}

export function InvoiceQuickFilters({
  counts,
  active,
  searchParams,
}: {
  counts: Counts;
  active: ActiveProps;
  searchParams: Record<string, string | undefined>;
}) {
  const activeKey = detectActive(active);

  const tabs: { key: QuickKey; label: string; count: number; tone?: "warning" | "danger" | "muted" }[] = [
    { key: "all", label: "Todas", count: counts.all },
    { key: "pending", label: "Pendientes", count: counts.pending, tone: "warning" },
    { key: "no_po", label: "Sin OC", count: counts.noPo, tone: "muted" },
    { key: "aging", label: "Atrasadas", count: counts.aging, tone: "danger" },
    { key: "recent", label: "Recientes", count: counts.recent, tone: "muted" },
    { key: "approved", label: "Aprobadas", count: counts.approved },
    { key: "rejected", label: "Rechazadas", count: counts.rejected },
  ];

  return (
    <nav
      aria-label="Filtros rápidos"
      className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden snap-x sm:mx-0 sm:px-0"
    >
      {tabs.map((tab) => {
        const isActive = activeKey === tab.key;
        const badgeTone =
          tab.tone === "danger"
            ? "bg-rose-100 text-rose-700"
            : tab.tone === "warning"
              ? "bg-amber-100 text-amber-700"
              : "bg-neutral-100 text-neutral-600";
        return (
          <Link
            key={tab.key}
            href={hrefFor(tab.key, searchParams)}
            scroll={false}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "inline-flex h-10 shrink-0 snap-start items-center gap-1.5 rounded-full border px-4 text-sm font-medium transition-colors sm:h-9 sm:px-3",
              isActive
                ? "border-primary bg-primary text-primary-foreground shadow-[0_1px_2px_0_rgb(0_0_0/0.06)]"
                : "border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50 active:bg-neutral-100",
            )}
          >
            <span>{tab.label}</span>
            <span
              className={cn(
                "inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold tabular-nums",
                isActive ? "bg-white/20 text-primary-foreground" : badgeTone,
              )}
            >
              {tab.count.toLocaleString("es-CO")}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
