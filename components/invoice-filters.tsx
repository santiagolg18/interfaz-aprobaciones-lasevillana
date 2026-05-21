"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useRef, useState, useTransition } from "react";
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
import { SearchInput } from "@/components/search-input";
import { ChevronDown, ChevronUp, X } from "lucide-react";
import { cn } from "@/lib/utils";

const ALL = "__all__";

type Supplier = { id: string; nombre: string };

export function InvoiceFilters({ suppliers }: { suppliers: Supplier[] }) {
  const router = useRouter();
  const sp = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [showAdvanced, setShowAdvanced] = useState(() =>
    Boolean(sp.get("min") || sp.get("max") || sp.get("po")),
  );

  // Local state para min/max con debounce, ya que son inputs numéricos libres.
  const externalMin = sp.get("min") ?? "";
  const externalMax = sp.get("max") ?? "";
  const [minVal, setMinVal] = useState(externalMin);
  const [maxVal, setMaxVal] = useState(externalMax);
  const [lastMin, setLastMin] = useState(externalMin);
  const [lastMax, setLastMax] = useState(externalMax);
  const minTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const maxTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync from URL when it changes externally (clear filters, chip remove).
  if (externalMin !== lastMin) {
    setLastMin(externalMin);
    setMinVal(externalMin);
  }
  if (externalMax !== lastMax) {
    setLastMax(externalMax);
    setMaxVal(externalMax);
  }

  function setParam(
    key: string,
    value: string | null,
    extra?: Record<string, string | null>,
  ) {
    const params = new URLSearchParams(sp.toString());
    if (value === null || value === "" || value === ALL) params.delete(key);
    else params.set(key, value);
    if (extra) {
      for (const [k, v] of Object.entries(extra)) {
        if (v === null || v === "") params.delete(k);
        else params.set(k, v);
      }
    }
    if (params.has("page")) params.delete("page");
    const qs = params.toString();
    startTransition(() => {
      router.replace(qs ? `/facturas?${qs}` : "/facturas", { scroll: false });
    });
  }

  function debouncedSetMin(value: string) {
    setMinVal(value);
    if (minTimer.current) clearTimeout(minTimer.current);
    minTimer.current = setTimeout(() => setParam("min", value || null), 350);
  }

  function debouncedSetMax(value: string) {
    setMaxVal(value);
    if (maxTimer.current) clearTimeout(maxTimer.current);
    maxTimer.current = setTimeout(() => setParam("max", value || null), 350);
  }

  const hasAny = [
    "status",
    "supplier_id",
    "from",
    "to",
    "q",
    "min",
    "max",
    "po",
    "quick",
    "sort",
  ].some((k) => sp.get(k));

  const poValue = sp.get("po") ?? "all";

  return (
    <div className="space-y-3">
      <SearchInput
        placeholder="Buscar por número, proveedor o NIT…"
        ariaLabel="Buscar facturas"
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-[1fr_1fr_180px_180px] lg:items-end">
        <div className="col-span-2 space-y-1.5 lg:col-span-1">
          <Label className="text-sm font-medium">Estado</Label>
          <Select
            value={sp.get("status") ?? ALL}
            onValueChange={(v) => setParam("status", v, { quick: null })}
          >
            <SelectTrigger className="h-11 w-full sm:h-9">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todos</SelectItem>
              <SelectItem value="pending">Pendiente</SelectItem>
              <SelectItem value="approved">Aprobada</SelectItem>
              <SelectItem value="rejected">Rechazada</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="col-span-2 space-y-1.5 lg:col-span-1">
          <Label className="text-sm font-medium">Proveedor</Label>
          <Select
            value={sp.get("supplier_id") ?? ALL}
            onValueChange={(v) => setParam("supplier_id", v)}
          >
            <SelectTrigger className="h-11 w-full sm:h-9">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todos</SelectItem>
              {suppliers.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Desde</Label>
          <Input
            type="date"
            className="h-11 sm:h-8"
            defaultValue={sp.get("from") ?? ""}
            onChange={(e) => setParam("from", e.target.value || null)}
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Hasta</Label>
          <Input
            type="date"
            className="h-11 sm:h-8"
            defaultValue={sp.get("to") ?? ""}
            onChange={(e) => setParam("to", e.target.value || null)}
          />
        </div>
      </div>

      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setShowAdvanced((v) => !v)}
          className="inline-flex h-9 items-center gap-1 rounded-md px-2 -mx-2 text-sm font-medium text-muted-foreground transition-colors hover:text-neutral-900 active:bg-neutral-100 sm:h-auto sm:text-xs"
          aria-expanded={showAdvanced}
        >
          {showAdvanced ? (
            <ChevronUp className="size-4 sm:size-3.5" />
          ) : (
            <ChevronDown className="size-4 sm:size-3.5" />
          )}
          Filtros avanzados
        </button>
        {hasAny ? (
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            disabled={pending}
            onClick={() =>
              startTransition(() =>
                router.replace("/facturas", { scroll: false }),
              )
            }
          >
            <X className="size-4" />
            Limpiar filtros
          </Button>
        ) : null}
      </div>

      {showAdvanced ? (
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-[1fr_1fr_auto] sm:items-end rounded-lg border border-dashed border-neutral-200 bg-neutral-50/60 p-3">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Monto mínimo</Label>
            <div className="relative">
              <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                $
              </span>
              <Input
                type="number"
                inputMode="numeric"
                placeholder="0"
                className="h-11 pl-6 sm:h-8"
                value={minVal}
                onChange={(e) => debouncedSetMin(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Monto máximo</Label>
            <div className="relative">
              <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                $
              </span>
              <Input
                type="number"
                inputMode="numeric"
                placeholder="Sin límite"
                className="h-11 pl-6 sm:h-8"
                value={maxVal}
                onChange={(e) => debouncedSetMax(e.target.value)}
              />
            </div>
          </div>
          <div className="col-span-2 space-y-1.5 sm:col-span-1">
            <Label className="text-sm font-medium">Orden de compra</Label>
            <div
              role="radiogroup"
              aria-label="Orden de compra"
              className="inline-flex w-full overflow-hidden rounded-lg border border-input bg-white"
            >
              {[
                { v: "all", label: "Todas" },
                { v: "with", label: "Con OC" },
                { v: "without", label: "Sin OC" },
              ].map((opt) => {
                const isActive = poValue === opt.v;
                return (
                  <button
                    key={opt.v}
                    type="button"
                    role="radio"
                    aria-checked={isActive}
                    onClick={() =>
                      setParam("po", opt.v === "all" ? null : opt.v)
                    }
                    className={cn(
                      "flex-1 px-2.5 py-2.5 text-sm font-medium transition-colors sm:py-1.5 sm:text-xs",
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
        </div>
      ) : null}
    </div>
  );
}
