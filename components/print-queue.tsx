"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  CheckCheck,
  Download,
  FileWarning,
  Loader2,
  Printer,
  Undo2,
} from "lucide-react";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DateCell } from "@/components/date-cell";
import { formatCOP, formatDateTime } from "@/lib/format";
import {
  markSentToAccounting,
  retryPdfGeneration,
  unmarkSentToAccounting,
} from "@/app/(dashboard)/facturas/lifecycle-actions";

export type PrintQueueItem = {
  id: string;
  invoice_number: string;
  supplier_name: string;
  supplier_nit: string;
  total_amount: number;
  received_at: string | null;
  pdfUrl: string | null;
  pdfReady: boolean;
  // pdf_generation_status de la factura: distingue "en proceso" de "falló".
  pdfStatus: string | null;
};

function PdfButton({
  item,
  compact = false,
}: {
  item: PrintQueueItem;
  /** En la tabla se acortan los textos para no ensanchar la columna. */
  compact?: boolean;
}) {
  const router = useRouter();
  const [retrying, startRetry] = useTransition();

  if (!item.pdfReady || !item.pdfUrl) {
    // Un intento fallido se veía idéntico a uno en curso y la factura quedaba
    // atascada sin salida; con estado 'error' ofrecemos reintentar.
    if (item.pdfStatus === "error") {
      return (
        <button
          type="button"
          disabled={retrying}
          onClick={() =>
            startRetry(async () => {
              const res = await retryPdfGeneration(item.id);
              if (!res.ok) {
                toast.error(res.error ?? "No se pudo reintentar");
                return;
              }
              toast.success("Generación del PDF reiniciada");
              router.refresh();
            })
          }
          className="inline-flex items-center gap-1.5 rounded-md border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-medium text-rose-700 transition-colors hover:bg-rose-100 disabled:opacity-60"
          title="La generación del PDF falló. Haz clic para reintentar."
        >
          {retrying ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <FileWarning className="size-3.5" />
          )}
          {compact ? "Reintentar" : "PDF falló · Reintentar"}
        </button>
      );
    }
    return (
      <span
        className="inline-flex items-center gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs font-medium text-amber-700"
        title="El PDF final aún no está disponible"
      >
        <FileWarning className="size-3.5" />
        {compact ? "En proceso" : "PDF en proceso"}
      </span>
    );
  }
  return (
    <Button asChild size="sm" className="gap-1.5">
      <a href={item.pdfUrl} target="_blank" rel="noopener noreferrer">
        <Download className="size-4" />
        {compact ? "Descargar" : "Descargar / Imprimir"}
      </a>
    </Button>
  );
}

export function PrintQueue({
  items,
  mode,
}: {
  items: PrintQueueItem[];
  mode: "ready" | "completed";
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();

  const selectableIds = useMemo(
    () => items.filter((i) => i.pdfReady).map((i) => i.id),
    [items],
  );
  const allSelected =
    selectableIds.length > 0 && selectableIds.every((id) => selected.has(id));
  const someSelected = selected.size > 0;

  function toggle(id: string, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function toggleAll(checked: boolean) {
    setSelected(checked ? new Set(selectableIds) : new Set());
  }

  function openSelected() {
    const urls = items
      .filter((i) => selected.has(i.id) && i.pdfUrl)
      .map((i) => i.pdfUrl!);
    if (urls.length === 0) {
      toast.error("Las seleccionadas no tienen PDF disponible");
      return;
    }
    // El bloqueador de popups suele permitir solo la primera pestaña; si no lo
    // detectamos, el usuario cree que abrió todas.
    let blocked = 0;
    for (const u of urls) {
      const win = window.open(u, "_blank", "noopener,noreferrer");
      if (!win) blocked += 1;
    }
    if (blocked > 0) {
      toast.warning(
        `El navegador bloqueó ${blocked} de ${urls.length} pestañas. Permite las ventanas emergentes para este sitio y vuelve a intentar.`,
        { duration: 8000 },
      );
    }
  }

  function sendSelected() {
    const ids = Array.from(selected);
    startTransition(async () => {
      const res = await markSentToAccounting(ids);
      if (!res.ok) {
        toast.error(res.error ?? "No se pudo completar la acción");
        return;
      }
      const updated = res.updated ?? 0;
      if (updated < ids.length) {
        toast.warning(
          `Se marcaron ${updated} de ${ids.length} facturas; las demás ya no estaban listas.`,
        );
      } else {
        toast.success(`${updated} factura(s) enviada(s) a contabilidad`);
      }
      setSelected(new Set());
      router.refresh();
    });
  }

  function revert(id: string) {
    startTransition(async () => {
      const res = await unmarkSentToAccounting(id);
      if (!res.ok) {
        toast.error(res.error ?? "No se pudo revertir");
        return;
      }
      toast.success("Factura devuelta a “Listas para imprimir”");
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      {/* Barra de acciones para la selección (solo modo "ready") */}
      {mode === "ready" && someSelected ? (
        <div className="sticky top-[calc(3.5rem+env(safe-area-inset-top)+0.5rem)] lg:top-2 z-30 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-primary/20 bg-[#eff4fc] px-4 py-2.5 shadow-[0_1px_2px_0_rgb(0_0_0/0.04)]">
          <span className="text-sm font-medium text-primary">
            {selected.size} seleccionada{selected.size === 1 ? "" : "s"}
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={openSelected}
              disabled={pending}
              className="gap-1.5"
            >
              <Printer className="size-4" />
              Abrir / Imprimir
            </Button>
            <Button
              size="sm"
              onClick={sendSelected}
              disabled={pending}
              className="gap-1.5"
            >
              {pending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <CheckCheck className="size-4" />
              )}
              Marcar enviadas a contabilidad
            </Button>
          </div>
        </div>
      ) : null}

      {/* Mobile: cards */}
      <ul className="lg:hidden space-y-2">
        {items.map((inv) => (
          <li
            key={inv.id}
            className="surface p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-neutral-800 truncate">
                  {inv.supplier_name}
                </div>
                <Link
                  href={`/facturas/${inv.id}`}
                  className="mt-0.5 inline-block text-xs text-muted-foreground tabular-nums truncate underline-offset-2 hover:underline"
                >
                  {inv.invoice_number}
                  {inv.supplier_nit ? ` · NIT ${inv.supplier_nit}` : ""}
                </Link>
              </div>
              {mode === "ready" ? (
                <Checkbox
                  checked={selected.has(inv.id)}
                  disabled={!inv.pdfReady}
                  onCheckedChange={(c) => toggle(inv.id, c === true)}
                  aria-label={`Seleccionar factura ${inv.invoice_number}`}
                />
              ) : null}
            </div>
            <div className="mt-2 flex items-end justify-between gap-3">
              <span className="text-xl font-bold text-neutral-900 tabular-nums">
                {formatCOP(inv.total_amount)}
              </span>
              <span className="text-xs text-muted-foreground">
                {formatDateTime(inv.received_at)}
              </span>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <PdfButton item={inv} />
              {mode === "completed" ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => revert(inv.id)}
                  disabled={pending}
                  className="gap-1.5 text-muted-foreground"
                >
                  <Undo2 className="size-4" />
                  Revertir
                </Button>
              ) : null}
            </div>
          </li>
        ))}
      </ul>

      {/* Desktop: table */}
      <div className="surface hidden lg:block overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              {mode === "ready" ? (
                <TableHead className="w-10">
                  <Checkbox
                    checked={allSelected}
                    disabled={selectableIds.length === 0}
                    onCheckedChange={(c) => toggleAll(c === true)}
                    aria-label="Seleccionar todas"
                  />
                </TableHead>
              ) : null}
              <TableHead>Número</TableHead>
              <TableHead>Proveedor</TableHead>
              <TableHead className="text-right">Monto</TableHead>
              <TableHead>Recibida</TableHead>
              <TableHead className="text-right">Documento</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((inv) => (
              <TableRow
                key={inv.id}
                className={cn(selected.has(inv.id) && "bg-primary/5")}
              >
                {mode === "ready" ? (
                  <TableCell className="w-10">
                    <Checkbox
                      checked={selected.has(inv.id)}
                      disabled={!inv.pdfReady}
                      onCheckedChange={(c) => toggle(inv.id, c === true)}
                      aria-label={`Seleccionar factura ${inv.invoice_number}`}
                    />
                  </TableCell>
                ) : null}
                <TableCell className="font-medium text-neutral-900 whitespace-nowrap">
                  <Link
                    href={`/facturas/${inv.id}`}
                    className="underline-offset-2 hover:underline"
                  >
                    {inv.invoice_number}
                  </Link>
                </TableCell>
                <TableCell className="w-full max-w-0">
                  <div className="truncate text-sm" title={inv.supplier_name}>
                    {inv.supplier_name}
                  </div>
                  <div className="truncate text-xs text-muted-foreground tabular-nums">
                    NIT {inv.supplier_nit}
                  </div>
                </TableCell>
                <TableCell className="text-right whitespace-nowrap tabular-nums">
                  {formatCOP(inv.total_amount)}
                </TableCell>
                <TableCell>
                  <DateCell value={inv.received_at} />
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <PdfButton item={inv} compact />
                    {mode === "completed" ? (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => revert(inv.id)}
                        disabled={pending}
                        className="text-muted-foreground"
                        aria-label={`Revertir factura ${inv.invoice_number}`}
                        title="Revertir envío a contabilidad"
                      >
                        <Undo2 className="size-4" />
                      </Button>
                    ) : null}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
