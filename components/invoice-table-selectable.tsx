"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Archive, ClipboardCheck, Copy, Paperclip, Trash2 } from "lucide-react";
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
import { Money } from "@/components/money";
import { StatusBadge } from "@/components/status-badge";
import { ApprovalProgress } from "@/components/approval-progress";
import { SortableHeader } from "@/components/sortable-header";
import { ArchiveButton } from "@/components/archive-button";
import { DeleteInvoiceButton } from "@/components/delete-invoice-button";
import { ConfirmDialog } from "@/components/confirm-dialog";
import {
  InvoiceNotesPopover,
  type InvoiceNote,
} from "@/components/invoice-notes-popover";
import { DateCell } from "@/components/date-cell";
import { cn } from "@/lib/utils";
import { formatDateTime, timeAgo } from "@/lib/format";
import {
  bulkArchiveInvoices,
  bulkDeleteInvoices,
} from "@/app/(dashboard)/facturas/lifecycle-actions";

export type SelectableInvoice = {
  id: string;
  invoice_number: string;
  supplier_name: string;
  supplier_nit: string;
  total_amount: number | string | null;
  received_at: string | null;
  status: string | null;
  current_approvals: number;
  required_approvals: number;
  po_storage_path: string | null;
  review_draft_saved_at: string | null;
  isDuplicate: boolean;
};

export function InvoiceTableSelectable({
  invoices,
  notes,
  archivable,
  activeTab,
  canManage,
  currentSort,
  searchParams,
}: {
  invoices: SelectableInvoice[];
  notes: Record<string, InvoiceNote[]>;
  archivable: boolean;
  activeTab: string;
  canManage: boolean;
  currentSort: string;
  searchParams: Record<string, string | undefined>;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // URL actual de la lista (pestaña, filtros, página) codificada como `from`,
  // para que el detalle pueda volver exactamente a esta vista.
  const backTarget = useMemo(() => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(searchParams)) {
      if (v) params.set(k, v);
    }
    const qs = params.toString();
    return qs ? `/facturas?${qs}` : "/facturas";
  }, [searchParams]);
  const detailHref = (id: string) =>
    backTarget === "/facturas"
      ? `/facturas/${id}`
      : `/facturas/${id}?from=${encodeURIComponent(backTarget)}`;

  const ids = useMemo(() => invoices.map((i) => i.id), [invoices]);
  const allSelected = ids.length > 0 && ids.every((id) => selected.has(id));
  const someSelected = selected.size > 0;
  const selectedIds = useMemo(() => Array.from(selected), [selected]);
  // En la pestaña "Por revisar" tiene sentido archivar en bloque.
  const canBulkArchive = activeTab === "por_revisar";

  function toggle(id: string, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }
  function toggleAll(checked: boolean) {
    setSelected(checked ? new Set(ids) : new Set());
  }
  function clearSelection() {
    setSelected(new Set());
  }

  // Columna de acciones por fila (archivar/restaurar + eliminar) para staff.
  const showRowActions = canManage;
  // Las notas viven dentro de la misma columna de acciones para no gastar una
  // columna entera; por eso la columna existe aunque el usuario no sea staff.
  const hasNotes = Object.keys(notes).length > 0;
  const showActionsCol = showRowActions || hasNotes;

  return (
    <div className="space-y-2">
      {/* Barra de acciones masivas */}
      {canManage && someSelected ? (
        <div className="sticky top-[calc(3.5rem+env(safe-area-inset-top)+0.5rem)] lg:top-2 z-30 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-primary/20 bg-[#eff4fc] px-4 py-2.5 shadow-[0_1px_2px_0_rgb(0_0_0/0.04)]">
          <span className="text-sm font-medium text-primary">
            {selected.size} seleccionada{selected.size === 1 ? "" : "s"}
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="ghost" size="sm" onClick={clearSelection}>
              Quitar selección
            </Button>
            {canBulkArchive ? (
              <ConfirmDialog
                title={`Archivar ${selected.size} factura${selected.size === 1 ? "" : "s"}`}
                description="Las facturas por revisar seleccionadas se moverán a Archivadas. Podrás restaurarlas cuando quieras."
                confirmLabel="Archivar"
                onConfirm={async () => {
                  const total = selectedIds.length;
                  const res = await bulkArchiveInvoices(selectedIds);
                  if (res.ok) {
                    clearSelection();
                    const updated = res.updated ?? 0;
                    if (updated < total) {
                      toast.warning(
                        `Se archivaron ${updated} de ${total} facturas; las demás ya no eran archivables.`,
                      );
                    } else {
                      toast.success(`${updated} factura(s) archivada(s)`);
                    }
                  }
                  return res;
                }}
                renderTrigger={(open) => (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={open}
                    className="gap-1.5"
                  >
                    <Archive className="size-4" />
                    Archivar
                  </Button>
                )}
              />
            ) : null}
            <ConfirmDialog
              title={`Eliminar ${selected.size} factura${selected.size === 1 ? "" : "s"}`}
              description="Se eliminarán permanentemente las facturas seleccionadas y sus archivos. Esta acción no se puede deshacer; quedará constancia en el historial."
              confirmLabel="Eliminar definitivamente"
              variant="destructive"
              requireReason
              reasonLabel="Motivo de la eliminación"
              reasonPlaceholder="Ej.: facturas duplicadas, cargadas por error…"
              onConfirm={async (reason) => {
                const total = selectedIds.length;
                const res = await bulkDeleteInvoices(selectedIds, reason);
                if (res.ok) {
                  clearSelection();
                  const updated = res.updated ?? 0;
                  if ((res.failed ?? 0) > 0 || updated < total) {
                    toast.warning(
                      `Se eliminaron ${updated} de ${total} facturas; el resto no se pudo eliminar.`,
                    );
                  } else {
                    toast.success(`${updated} factura(s) eliminada(s)`);
                  }
                }
                return res;
              }}
              renderTrigger={(open) => (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={open}
                  className="gap-1.5 border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                >
                  <Trash2 className="size-4" />
                  Eliminar
                </Button>
              )}
            />
          </div>
        </div>
      ) : null}

      {/* Mobile: cards */}
      <ul className="lg:hidden space-y-2">
        {invoices.map((inv) => (
          <li
            key={inv.id}
            className={cn(
              "relative surface p-4",
              selected.has(inv.id) && "ring-1 ring-primary/40",
            )}
          >
            <Link
              href={detailHref(inv.id)}
              className="absolute inset-0 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
              aria-label={`Ver factura ${inv.invoice_number}`}
            />
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-neutral-800 truncate">
                  {inv.supplier_name}
                </div>
                <div className="mt-0.5 inline-flex items-center gap-1 text-xs text-muted-foreground tabular-nums truncate">
                  {inv.invoice_number}
                  {inv.po_storage_path ? (
                    <Paperclip
                      className="size-3 text-muted-foreground"
                      aria-label="Orden de compra cargada"
                    />
                  ) : null}
                  {inv.supplier_nit ? ` · NIT ${inv.supplier_nit}` : ""}
                </div>
                {inv.isDuplicate || showDraftBadge(inv) ? (
                  <div className="mt-1.5 flex flex-wrap items-center gap-1">
                    {inv.isDuplicate ? <DuplicateBadge /> : null}
                    {showDraftBadge(inv) ? (
                      <DraftBadge savedAt={inv.review_draft_saved_at!} />
                    ) : null}
                  </div>
                ) : null}
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={inv.status} />
                {canManage ? (
                  <span className="relative z-10">
                    <Checkbox
                      checked={selected.has(inv.id)}
                      onCheckedChange={(c) => toggle(inv.id, c === true)}
                      aria-label={`Seleccionar factura ${inv.invoice_number}`}
                    />
                  </span>
                ) : null}
              </div>
            </div>
            <div className="mt-2 flex items-end justify-between gap-3">
              <Money
                value={inv.total_amount}
                className="text-xl font-bold text-neutral-900"
              />
              <div className="relative z-10 flex items-center gap-2">
                {notes[inv.id] ? (
                  <InvoiceNotesPopover notes={notes[inv.id]} />
                ) : null}
                <ApprovalProgress
                  current={inv.current_approvals}
                  required={inv.required_approvals}
                  status={inv.status}
                  size="md"
                />
              </div>
            </div>
            <div className="mt-1 flex items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground">
                Recibida {formatDateTime(inv.received_at)}
              </span>
              {showRowActions ? (
                <div className="relative z-10 flex items-center gap-1">
                  {archivable ? (
                    <ArchiveButton
                      invoiceId={inv.id}
                      action={activeTab === "archivadas" ? "unarchive" : "archive"}
                    />
                  ) : null}
                  <DeleteInvoiceButton
                    invoiceId={inv.id}
                    invoiceNumber={inv.invoice_number}
                    status={inv.status}
                  />
                </div>
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
              {canManage ? (
                <TableHead className="w-10">
                  <Checkbox
                    checked={allSelected}
                    disabled={ids.length === 0}
                    onCheckedChange={(c) => toggleAll(c === true)}
                    aria-label="Seleccionar todas"
                  />
                </TableHead>
              ) : null}
              <TableHead>
                <SortableHeader
                  label="Número"
                  field="invoice_number"
                  currentSort={currentSort}
                  searchParams={searchParams}
                  pathname="/facturas"
                  defaultDirection="asc"
                />
              </TableHead>
              <TableHead>Proveedor</TableHead>
              <TableHead className="text-right">
                <SortableHeader
                  label="Monto"
                  field="amount"
                  currentSort={currentSort}
                  searchParams={searchParams}
                  pathname="/facturas"
                  align="right"
                />
              </TableHead>
              <TableHead>
                <SortableHeader
                  label="Recibida"
                  field="received"
                  currentSort={currentSort}
                  searchParams={searchParams}
                  pathname="/facturas"
                />
              </TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="hidden xl:table-cell">Progreso</TableHead>
              {showActionsCol ? (
                <TableHead className="w-28 text-right">
                  {showRowActions ? "Acciones" : "Notas"}
                </TableHead>
              ) : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.map((inv) => (
              <TableRow
                key={inv.id}
                className={cn("relative", selected.has(inv.id) && "bg-primary/5")}
              >
                {canManage ? (
                  <TableCell className="w-10">
                    <span className="relative z-10">
                      <Checkbox
                        checked={selected.has(inv.id)}
                        onCheckedChange={(c) => toggle(inv.id, c === true)}
                        aria-label={`Seleccionar factura ${inv.invoice_number}`}
                      />
                    </span>
                  </TableCell>
                ) : null}
                <TableCell className="font-medium text-neutral-900">
                  <Link
                    href={detailHref(inv.id)}
                    className="inline-flex items-center gap-1.5 whitespace-nowrap after:absolute after:inset-0 after:content-[''] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 rounded-sm"
                  >
                    {inv.invoice_number}
                    {inv.po_storage_path ? (
                      <Paperclip
                        className="size-3.5 text-muted-foreground"
                        aria-label="Orden de compra cargada"
                      />
                    ) : null}
                  </Link>
                  {inv.isDuplicate || showDraftBadge(inv) ? (
                    <div className="mt-1 flex flex-wrap items-center gap-1">
                      {inv.isDuplicate ? <DuplicateBadge /> : null}
                      {showDraftBadge(inv) ? (
                        <DraftBadge savedAt={inv.review_draft_saved_at!} />
                      ) : null}
                    </div>
                  ) : null}
                </TableCell>
                <TableCell className="w-full max-w-0">
                  <div className="truncate text-sm" title={inv.supplier_name}>
                    {inv.supplier_name}
                  </div>
                  <div className="truncate text-xs text-muted-foreground tabular-nums">
                    NIT {inv.supplier_nit}
                  </div>
                </TableCell>
                <TableCell className="text-right whitespace-nowrap">
                  <Money value={inv.total_amount} />
                </TableCell>
                <TableCell>
                  <DateCell value={inv.received_at} />
                </TableCell>
                <TableCell>
                  <StatusBadge
                    status={inv.status}
                    className="whitespace-normal"
                  />
                </TableCell>
                <TableCell className="hidden xl:table-cell">
                  <ApprovalProgress
                    current={inv.current_approvals}
                    required={inv.required_approvals}
                    status={inv.status}
                  />
                </TableCell>
                {showActionsCol ? (
                  <TableCell className="text-right">
                    <div className="relative z-10 flex items-center justify-end gap-0.5">
                      {notes[inv.id] ? (
                        <InvoiceNotesPopover notes={notes[inv.id]} />
                      ) : null}
                      {showRowActions ? (
                        <>
                          {archivable ? (
                            <ArchiveButton
                              invoiceId={inv.id}
                              action={
                                activeTab === "archivadas"
                                  ? "unarchive"
                                  : "archive"
                              }
                              iconOnly
                            />
                          ) : null}
                          <DeleteInvoiceButton
                            invoiceId={inv.id}
                            invoiceNumber={inv.invoice_number}
                            status={inv.status}
                            iconOnly
                          />
                        </>
                      ) : null}
                    </div>
                  </TableCell>
                ) : null}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function showDraftBadge(inv: SelectableInvoice) {
  return (
    Boolean(inv.review_draft_saved_at) &&
    (inv.status === "in_review" || inv.status === "review_rejected")
  );
}

// La revisión de compras ya tiene avance guardado (checklist u observaciones).
// El operario lo reconoce como "borrador": etiqueta corta y siempre con texto,
// porque un icono suelto no se entiende de un vistazo.
function DraftBadge({ savedAt }: { savedAt: string }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-semibold text-sky-700 ring-1 ring-inset ring-sky-200 align-middle whitespace-nowrap"
      title={`Revisión de compras empezada · última edición ${timeAgo(savedAt)}`}
    >
      <ClipboardCheck className="size-3 shrink-0" />
      Borrador
    </span>
  );
}

function DuplicateBadge() {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 ring-1 ring-inset ring-amber-200 align-middle whitespace-nowrap"
      title="Duplicada: hay otra factura no archivada con el mismo número y NIT"
    >
      <Copy className="size-3 shrink-0" />
      Duplicada
    </span>
  );
}
