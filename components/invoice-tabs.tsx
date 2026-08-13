import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  TABS,
  type TabDef,
  type TabKey,
  type TabTone,
} from "@/app/(dashboard)/facturas/tabs";

// Filtros que se conservan al cambiar de pestaña (no dependen del estado).
const PRESERVE = ["supplier_id", "from", "to", "q", "min", "max", "po", "sort", "front"] as const;

function hrefFor(key: TabKey, base: Record<string, string | undefined>): string {
  const params = new URLSearchParams();
  for (const k of PRESERVE) {
    const v = base[k];
    if (v) params.set(k, v);
  }
  params.set("tab", key);
  return `/facturas?${params.toString()}`;
}

function badgeTone(tone: TabTone, isActive: boolean): string {
  if (isActive) return "bg-white/20 text-primary-foreground";
  switch (tone) {
    case "danger":
      return "bg-rose-100 text-rose-700";
    case "warning":
      return "bg-amber-100 text-amber-700";
    case "success":
      return "bg-emerald-100 text-emerald-700";
    case "teal":
      return "bg-teal-100 text-teal-700";
    case "rose":
      return "bg-rose-100 text-rose-700";
    default:
      return "bg-neutral-100 text-neutral-600";
  }
}

export function InvoiceTabs({
  counts,
  activeTab,
  searchParams,
}: {
  counts: Record<TabKey, number>;
  activeTab: TabKey;
  searchParams: Record<string, string | undefined>;
}) {
  const flowTabs = TABS.filter((t) => t.group === "flow");
  const sideTabs = TABS.filter((t) => t.group === "side");

  function pill(tab: TabDef) {
    const isActive = activeTab === tab.key;
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
            badgeTone(tab.tone, isActive),
          )}
        >
          {counts[tab.key].toLocaleString("es-CO")}
        </span>
      </Link>
    );
  }

  return (
    <nav
      aria-label="Etapas de la factura"
      className="-mx-4 flex items-center gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden snap-x sm:mx-0 sm:px-0"
    >
      {/* Flujo principal: etapas en orden, unidas por flechas. */}
      {flowTabs.map((tab, i) => (
        <div key={tab.key} className="flex shrink-0 items-center gap-2">
          {i > 0 ? (
            <ChevronRight
              aria-hidden
              className="size-4 shrink-0 text-neutral-300"
            />
          ) : null}
          {pill(tab)}
        </div>
      ))}

      {/* Separador hacia los estados fuera del flujo. */}
      <span
        aria-hidden
        className="mx-1 h-6 shrink-0 self-center border-l border-neutral-200"
      />

      {/* Estados fuera del flujo (sin flechas). */}
      {sideTabs.map((tab) => pill(tab))}
    </nav>
  );
}
