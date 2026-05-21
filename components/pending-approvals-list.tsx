"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Filter, Inbox, SlidersHorizontal, X } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Money } from "@/components/money";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/empty-state";
import { SearchInput } from "@/components/search-input";
import { InlineApprovalActions } from "@/components/inline-approval-actions";
import { formatDateTime, formatCOP } from "@/lib/format";
import { cn } from "@/lib/utils";

export type PendingRow = {
  approvalId: string;
  createdAt: string;
  invoice: {
    id: string;
    invoice_number: string;
    supplier_name: string;
    supplier_nit: string | null;
    total_amount: number;
    received_at: string;
    status: string | null;
    current_approvals: number;
    required_approvals: number;
  };
};

type SortValue = "recent" | "oldest" | "amount_desc" | "amount_asc";
type AgeFilter = "all" | "gt3" | "gt7";

export function PendingApprovalsList({ rows }: { rows: PendingRow[] }) {
  const sp = useSearchParams();
  const searchQuery = sp.get("q") ?? "";
  const [sort, setSort] = useState<SortValue>("recent");
  const [minAmount, setMinAmount] = useState<string>("");
  const [maxAmount, setMaxAmount] = useState<string>("");
  const [ageFilter, setAgeFilter] = useState<AgeFilter>("all");
  // Snapshot del momento de carga; suficientemente preciso para clasificar antigüedad.
  const [now] = useState(() => Date.now());

  const filtered = useMemo(() => {
    const term = searchQuery.trim().toLowerCase();
    const min = minAmount ? Number(minAmount) : null;
    const max = maxAmount ? Number(maxAmount) : null;

    const result = rows.filter((r) => {
      const inv = r.invoice;
      if (term) {
        const haystack = `${inv.invoice_number} ${inv.supplier_name} ${inv.supplier_nit ?? ""}`.toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      if (min !== null && !Number.isNaN(min) && inv.total_amount < min) return false;
      if (max !== null && !Number.isNaN(max) && inv.total_amount > max) return false;
      if (ageFilter !== "all") {
        const ageDays = (now - new Date(r.createdAt).getTime()) / 86400000;
        if (ageFilter === "gt3" && ageDays < 3) return false;
        if (ageFilter === "gt7" && ageDays < 7) return false;
      }
      return true;
    });

    result.sort((a, b) => {
      switch (sort) {
        case "oldest":
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case "amount_desc":
          return b.invoice.total_amount - a.invoice.total_amount;
        case "amount_asc":
          return a.invoice.total_amount - b.invoice.total_amount;
        case "recent":
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });
    return result;
  }, [rows, searchQuery, sort, minAmount, maxAmount, ageFilter, now]);

  const hasAmountFilter = Boolean(minAmount || maxAmount);
  const hasAgeFilter = ageFilter !== "all";
  const activeAdvanced = (hasAmountFilter ? 1 : 0) + (hasAgeFilter ? 1 : 0);

  function clearAll() {
    setMinAmount("");
    setMaxAmount("");
    setAgeFilter("all");
  }

  return (
    <div className="space-y-3">
      <SearchInput
        placeholder="Buscar por número, proveedor o NIT…"
        ariaLabel="Buscar mis aprobaciones"
      />

      <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:justify-end">
        <Select value={sort} onValueChange={(v) => setSort((v ?? "recent") as SortValue)}>
          <SelectTrigger className="h-11 w-full sm:h-9 sm:w-44" aria-label="Ordenar">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="recent">Más recientes</SelectItem>
            <SelectItem value="oldest">Más antiguas</SelectItem>
            <SelectItem value="amount_desc">Monto mayor</SelectItem>
            <SelectItem value="amount_asc">Monto menor</SelectItem>
          </SelectContent>
        </Select>

        <Popover>
          <PopoverTrigger
            render={
              <Button
                variant="outline"
                className="relative h-11 w-full sm:h-9 sm:w-auto"
              >
                <SlidersHorizontal className="size-4" />
                Filtros
                {activeAdvanced > 0 ? (
                  <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-semibold text-primary-foreground">
                    {activeAdvanced}
                  </span>
                ) : null}
              </Button>
            }
          />
          <PopoverContent align="end" className="w-[calc(100vw-2rem)] max-w-xs p-3 sm:w-72">
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Rango de monto
                </Label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                      $
                    </span>
                    <Input
                      type="number"
                      inputMode="numeric"
                      placeholder="Mín."
                      className="h-11 pl-5 sm:h-9"
                      value={minAmount}
                      onChange={(e) => setMinAmount(e.target.value)}
                    />
                  </div>
                  <div className="relative flex-1">
                    <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                      $
                    </span>
                    <Input
                      type="number"
                      inputMode="numeric"
                      placeholder="Máx."
                      className="h-11 pl-5 sm:h-9"
                      value={maxAmount}
                      onChange={(e) => setMaxAmount(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Antigüedad en cola
                </Label>
                <div
                  role="radiogroup"
                  aria-label="Antigüedad"
                  className="inline-flex w-full overflow-hidden rounded-lg border border-input bg-white"
                >
                  {[
                    { v: "all" as AgeFilter, label: "Todas" },
                    { v: "gt3" as AgeFilter, label: ">3 días" },
                    { v: "gt7" as AgeFilter, label: ">7 días" },
                  ].map((opt) => {
                    const isActive = ageFilter === opt.v;
                    return (
                      <button
                        key={opt.v}
                        type="button"
                        role="radio"
                        aria-checked={isActive}
                        onClick={() => setAgeFilter(opt.v)}
                        className={cn(
                          "flex-1 px-2.5 py-3 text-sm font-medium transition-colors sm:py-1.5 sm:text-xs",
                          isActive
                            ? "bg-primary text-primary-foreground"
                            : "text-neutral-700 hover:bg-neutral-50 active:bg-neutral-100",
                        )}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {activeAdvanced > 0 ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAll}
                  className="w-full text-muted-foreground"
                >
                  <X className="size-3.5" />
                  Limpiar filtros
                </Button>
              ) : null}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span>
          Mostrando{" "}
          <span className="font-semibold text-neutral-900 tabular-nums">
            {filtered.length.toLocaleString("es-CO")}
          </span>{" "}
          de{" "}
          <span className="font-semibold text-neutral-900 tabular-nums">
            {rows.length.toLocaleString("es-CO")}
          </span>
        </span>
        {hasAmountFilter ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/5 px-2 py-0.5 font-medium text-primary">
            <Filter className="size-3" />
            {minAmount ? `≥ ${formatCOP(Number(minAmount))}` : ""}
            {minAmount && maxAmount ? " · " : ""}
            {maxAmount ? `≤ ${formatCOP(Number(maxAmount))}` : ""}
          </span>
        ) : null}
        {hasAgeFilter ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 font-medium text-amber-700">
            {ageFilter === "gt3" ? "Antigüedad >3 días" : "Antigüedad >7 días"}
          </span>
        ) : null}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-lg border bg-white shadow-[0_1px_2px_0_rgb(0_0_0/0.03)]">
          <EmptyState
            icon={<Inbox />}
            title={
              rows.length === 0
                ? "Nada pendiente"
                : "Sin resultados para los filtros"
            }
            description={
              rows.length === 0
                ? "Cuando una factura te sea asignada aparecerá aquí."
                : "Ajusta o limpia los filtros para ver más resultados."
            }
          />
        </div>
      ) : (
        <>
          {/* Mobile: cards */}
          <ul className="md:hidden space-y-2">
            {filtered.map((r) => {
              const inv = r.invoice;
              return (
                <li key={r.approvalId}>
                  <div className="block rounded-xl border bg-white p-4 shadow-[0_1px_2px_0_rgb(0_0_0/0.03)]">
                    <Link
                      href={`/facturas/${inv.id}`}
                      className="block rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="text-sm text-neutral-700 truncate">
                            {inv.supplier_name}
                          </div>
                          <div className="mt-0.5 text-xs text-muted-foreground tabular-nums truncate">
                            {inv.invoice_number}
                            {inv.supplier_nit ? ` · NIT ${inv.supplier_nit}` : ""}
                          </div>
                        </div>
                        <StatusBadge status={inv.status} />
                      </div>
                      <div className="mt-2">
                        <Money
                          value={inv.total_amount}
                          className="text-xl font-bold text-neutral-900"
                        />
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        Recibida {formatDateTime(inv.received_at)}
                      </div>
                    </Link>
                    <InlineApprovalActions
                      invoiceId={inv.id}
                      approvalId={r.approvalId}
                      invoiceNumber={inv.invoice_number}
                      supplierName={inv.supplier_name}
                      variant="stacked"
                    />
                  </div>
                </li>
              );
            })}
          </ul>

          {/* Desktop: table */}
          <div className="hidden md:block rounded-lg border bg-white overflow-hidden shadow-[0_1px_2px_0_rgb(0_0_0/0.03)]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número</TableHead>
                  <TableHead>Proveedor</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                  <TableHead>Recibida</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => {
                  const inv = r.invoice;
                  return (
                    <TableRow key={r.approvalId} className="relative">
                      <TableCell className="font-medium text-neutral-900 whitespace-nowrap">
                        <Link
                          href={`/facturas/${inv.id}`}
                          className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 rounded-sm"
                        >
                          {inv.invoice_number}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{inv.supplier_name}</div>
                        {inv.supplier_nit ? (
                          <div className="text-xs text-muted-foreground tabular-nums">
                            NIT {inv.supplier_nit}
                          </div>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        <Money value={inv.total_amount} />
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {formatDateTime(inv.received_at)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={inv.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        <InlineApprovalActions
                          invoiceId={inv.id}
                          approvalId={r.approvalId}
                          invoiceNumber={inv.invoice_number}
                          supplierName={inv.supplier_name}
                          variant="compact"
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}
