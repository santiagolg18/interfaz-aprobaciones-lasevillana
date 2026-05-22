import Link from "next/link";
import { Paperclip, Plus, Receipt, X } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { InvoiceFilters } from "@/components/invoice-filters";
import { InvoiceQuickFilters } from "@/components/invoice-quick-filters";
import { SortableHeader } from "@/components/sortable-header";
import { MobileSortSelect } from "@/components/mobile-sort-select";
import { Money } from "@/components/money";
import { StatusBadge } from "@/components/status-badge";
import { ApprovalProgress } from "@/components/approval-progress";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Pagination } from "@/components/pagination";
import { Button } from "@/components/ui/button";
import {
  InvoiceNotesPopover,
  type InvoiceNote,
} from "@/components/invoice-notes-popover";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { formatCOP, formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;
const DEFAULT_SORT = "received_desc";

type SearchParams = Promise<{
  status?: string;
  supplier_id?: string;
  from?: string;
  to?: string;
  q?: string;
  min?: string;
  max?: string;
  po?: string;
  quick?: string;
  sort?: string;
  page?: string;
}>;

const STATUS_LABEL: Record<string, string> = {
  pending: "Pendiente",
  approved: "Aprobada",
  rejected: "Rechazada",
};

const QUICK_LABEL: Record<string, string> = {
  aging: "Atrasadas (>7 días)",
  recent: "Recientes (24h)",
};

const PO_LABEL: Record<string, string> = {
  with: "Con OC",
  without: "Sin OC",
};

const SORT_OPTIONS: { value: string; label: string }[] = [
  { value: "received_desc", label: "Más recientes primero" },
  { value: "received_asc", label: "Más antiguas primero" },
  { value: "amount_desc", label: "Monto mayor primero" },
  { value: "amount_asc", label: "Monto menor primero" },
];

function sortToOrder(sort: string): { column: string; ascending: boolean } {
  switch (sort) {
    case "received_asc":
      return { column: "received_at", ascending: true };
    case "amount_desc":
      return { column: "total_amount", ascending: false };
    case "amount_asc":
      return { column: "total_amount", ascending: true };
    case "received_desc":
    default:
      return { column: "received_at", ascending: false };
  }
}

export default async function FacturasPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const { status, supplier_id, from, to, q, min, max, po, quick, sort, page } = sp;
  const supabase = await createClient();
  const me = await getCurrentUser();
  const canCreateInvoice = me?.role === "admin" || me?.role === "purchasing";

  const currentSort = sort && /^(received|amount)_(asc|desc)$/.test(sort)
    ? sort
    : DEFAULT_SORT;
  const currentPage = Math.max(1, parseInt(page ?? "1", 10) || 1);

  // Aging cutoff = hace 7 días (para quick=aging y para el conteo).
  // Date.now() es legítimo en un Server Component que re-ejecuta en cada request.
  /* eslint-disable react-hooks/purity */
  const agingCutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const recentCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  /* eslint-enable react-hooks/purity */

  let query = supabase
    .from("invoices")
    .select(
      "id, invoice_number, supplier_id, supplier_name, supplier_nit, total_amount, received_at, status, current_approvals, required_approvals, po_storage_path",
      { count: "exact" },
    );

  const order = sortToOrder(currentSort);
  query = query.order(order.column, { ascending: order.ascending });

  if (status) query = query.eq("status", status);
  if (supplier_id) query = query.eq("supplier_id", supplier_id);
  if (from) query = query.gte("received_at", `${from}T00:00:00Z`);
  if (to) query = query.lte("received_at", `${to}T23:59:59Z`);
  if (q) {
    const pattern = `%${q.trim()}%`;
    query = query.or(
      `invoice_number.ilike.${pattern},supplier_name.ilike.${pattern},supplier_nit.ilike.${pattern}`,
    );
  }
  if (min) {
    const n = Number(min);
    if (!Number.isNaN(n)) query = query.gte("total_amount", n);
  }
  if (max) {
    const n = Number(max);
    if (!Number.isNaN(n)) query = query.lte("total_amount", n);
  }
  if (po === "with") query = query.not("po_storage_path", "is", null);
  if (po === "without") query = query.is("po_storage_path", null);
  if (quick === "aging") {
    query = query.eq("status", "pending").lte("received_at", agingCutoff);
  } else if (quick === "recent") {
    query = query.gte("received_at", recentCutoff);
  }

  const offset = (currentPage - 1) * PAGE_SIZE;
  query = query.range(offset, offset + PAGE_SIZE - 1);

  // Una query auxiliar para el mini-resumen (totales) sin paginar.
  let totalsQuery = supabase
    .from("invoices")
    .select("total_amount", { count: "exact" });
  if (status) totalsQuery = totalsQuery.eq("status", status);
  if (supplier_id) totalsQuery = totalsQuery.eq("supplier_id", supplier_id);
  if (from) totalsQuery = totalsQuery.gte("received_at", `${from}T00:00:00Z`);
  if (to) totalsQuery = totalsQuery.lte("received_at", `${to}T23:59:59Z`);
  if (q) {
    const pattern = `%${q.trim()}%`;
    totalsQuery = totalsQuery.or(
      `invoice_number.ilike.${pattern},supplier_name.ilike.${pattern},supplier_nit.ilike.${pattern}`,
    );
  }
  if (min) {
    const n = Number(min);
    if (!Number.isNaN(n)) totalsQuery = totalsQuery.gte("total_amount", n);
  }
  if (max) {
    const n = Number(max);
    if (!Number.isNaN(n)) totalsQuery = totalsQuery.lte("total_amount", n);
  }
  if (po === "with") totalsQuery = totalsQuery.not("po_storage_path", "is", null);
  if (po === "without") totalsQuery = totalsQuery.is("po_storage_path", null);
  if (quick === "aging") {
    totalsQuery = totalsQuery
      .eq("status", "pending")
      .lte("received_at", agingCutoff);
  } else if (quick === "recent") {
    totalsQuery = totalsQuery.gte("received_at", recentCutoff);
  }

  // Conteos por quick filter. Aplicamos los filtros agnósticos (no status/quick/po)
  // para que los contadores reflejen el universo dentro del resto de filtros.
  const headCount = (
    s?: "pending" | "approved" | "rejected",
    opts?: { aging?: boolean; recent?: boolean; noPo?: boolean },
  ) => {
    let b = supabase
      .from("invoices")
      .select("id", { count: "exact", head: true });
    if (supplier_id) b = b.eq("supplier_id", supplier_id);
    if (from) b = b.gte("received_at", `${from}T00:00:00Z`);
    if (to) b = b.lte("received_at", `${to}T23:59:59Z`);
    if (q) {
      const pattern = `%${q.trim()}%`;
      b = b.or(
        `invoice_number.ilike.${pattern},supplier_name.ilike.${pattern},supplier_nit.ilike.${pattern}`,
      );
    }
    if (min) {
      const n = Number(min);
      if (!Number.isNaN(n)) b = b.gte("total_amount", n);
    }
    if (max) {
      const n = Number(max);
      if (!Number.isNaN(n)) b = b.lte("total_amount", n);
    }
    if (s) b = b.eq("status", s);
    if (opts?.aging) b = b.eq("status", "pending").lte("received_at", agingCutoff);
    if (opts?.recent) b = b.gte("received_at", recentCutoff);
    if (opts?.noPo) b = b.is("po_storage_path", null);
    return b;
  };

  const [
    invoicesResult,
    suppliersResult,
    totalsResult,
    allCount,
    pendingCount,
    approvedCount,
    rejectedCount,
    noPoCount,
    agingCount,
    recentCount,
  ] = await Promise.all([
    query,
    supabase.from("suppliers").select("id, nombre").order("nombre"),
    totalsQuery,
    headCount(),
    headCount("pending"),
    headCount("approved"),
    headCount("rejected"),
    headCount(undefined, { noPo: true }),
    headCount(undefined, { aging: true }),
    headCount(undefined, { recent: true }),
  ]);

  const { data: invoices, error, count } = invoicesResult;
  const { data: suppliers } = suppliersResult;
  const { data: totalsData } = totalsResult;

  // Notas de aprobadores para las facturas visibles en esta página. Query separada
  // para no inflar la principal ni complicar la paginación con joins.
  const invoiceIds = (invoices ?? []).map((i) => i.id);
  const { data: notedApprovals } = invoiceIds.length
    ? await supabase
        .from("approvals")
        .select("invoice_id, status, notes, approved_at, approvers(name)")
        .in("invoice_id", invoiceIds)
        .not("notes", "is", null)
        .neq("notes", "")
        .order("approved_at", { ascending: true })
    : { data: [] };

  const notesByInvoice = new Map<string, InvoiceNote[]>();
  for (const a of notedApprovals ?? []) {
    if (!a.invoice_id || !a.notes) continue;
    const approver = a.approvers as { name: string } | null;
    const list = notesByInvoice.get(a.invoice_id) ?? [];
    list.push({
      approverName: approver?.name ?? "—",
      status: a.status,
      approvedAt: a.approved_at,
      notes: a.notes,
    });
    notesByInvoice.set(a.invoice_id, list);
  }

  const totalCount = count ?? 0;
  const sumTotal = (totalsData ?? []).reduce(
    (acc, row) => acc + Number(row.total_amount ?? 0),
    0,
  );
  const totalsCount = totalsResult.count ?? 0;
  const avgTotal = totalsCount > 0 ? sumTotal / totalsCount : 0;

  const supplierMap = new Map((suppliers ?? []).map((s) => [s.id, s.nombre]));

  // Chips de filtros activos
  type ActiveFilter = { key: string; label: string; value: string };
  const activeFilters: ActiveFilter[] = [];
  if (status) {
    activeFilters.push({
      key: "status",
      label: "Estado",
      value: STATUS_LABEL[status] ?? status,
    });
  }
  if (supplier_id) {
    activeFilters.push({
      key: "supplier_id",
      label: "Proveedor",
      value: supplierMap.get(supplier_id) ?? supplier_id,
    });
  }
  if (from) activeFilters.push({ key: "from", label: "Desde", value: from });
  if (to) activeFilters.push({ key: "to", label: "Hasta", value: to });
  if (q) activeFilters.push({ key: "q", label: "Búsqueda", value: q });
  if (min)
    activeFilters.push({
      key: "min",
      label: "Mín.",
      value: formatCOP(Number(min)),
    });
  if (max)
    activeFilters.push({
      key: "max",
      label: "Máx.",
      value: formatCOP(Number(max)),
    });
  if (po && PO_LABEL[po])
    activeFilters.push({ key: "po", label: "OC", value: PO_LABEL[po] });
  if (quick && QUICK_LABEL[quick])
    activeFilters.push({
      key: "quick",
      label: "Vista",
      value: QUICK_LABEL[quick],
    });

  function urlWithout(keyToRemove: string) {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) {
      if (k === keyToRemove || k === "page" || !v) continue;
      params.set(k, v as string);
    }
    const qs = params.toString();
    return qs ? `/facturas?${qs}` : "/facturas";
  }

  const counts = {
    all: allCount.count ?? 0,
    pending: pendingCount.count ?? 0,
    approved: approvedCount.count ?? 0,
    rejected: rejectedCount.count ?? 0,
    noPo: noPoCount.count ?? 0,
    aging: agingCount.count ?? 0,
    recent: recentCount.count ?? 0,
  };

  const searchParamsRecord: Record<string, string | undefined> = {
    status,
    supplier_id,
    from,
    to,
    q,
    min,
    max,
    po,
    quick,
    sort: sort && sort !== DEFAULT_SORT ? sort : undefined,
  };

  const showingFrom = totalCount === 0 ? 0 : offset + 1;
  const showingTo = Math.min(offset + PAGE_SIZE, totalCount);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Facturas"
        description="Facturas recibidas y su estado de aprobación."
        actions={
          canCreateInvoice ? (
            <Button asChild size="sm">
              <Link href="/facturas/nueva">
                <Plus className="size-4" />
                Nueva factura
              </Link>
            </Button>
          ) : null
        }
      />

      <InvoiceQuickFilters
        counts={counts}
        active={{ status, quick, po }}
        searchParams={sp}
      />

      <div className="rounded-lg border bg-white p-4 shadow-[0_1px_2px_0_rgb(0_0_0/0.03)]">
        <InvoiceFilters suppliers={suppliers ?? []} />
      </div>

      {error ? (
        <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          Error al cargar facturas: {error.message}
        </div>
      ) : null}

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm">
            <span className="font-semibold text-neutral-900 tabular-nums">
              {totalCount.toLocaleString("es-CO")}
            </span>{" "}
            <span className="text-muted-foreground">
              {totalCount === 1 ? "factura" : "facturas"}
            </span>
            {totalCount > 0 ? (
              <span className="hidden text-muted-foreground sm:inline">
                {" · Total "}
                <span className="font-semibold text-neutral-900">
                  {formatCOP(sumTotal)}
                </span>
                {" · Promedio "}
                <span className="font-semibold text-neutral-900">
                  {formatCOP(avgTotal)}
                </span>
              </span>
            ) : null}
          </div>

          {totalCount > 0 ? (
            <div className="md:hidden">
              <MobileSortSelect
                options={SORT_OPTIONS}
                pathname="/facturas"
                defaultValue={DEFAULT_SORT}
              />
            </div>
          ) : null}
        </div>

        {totalCount > 0 ? (
          <div className="text-xs text-muted-foreground sm:hidden">
            Total{" "}
            <span className="font-semibold text-neutral-900">
              {formatCOP(sumTotal)}
            </span>
            {" · Promedio "}
            <span className="font-semibold text-neutral-900">
              {formatCOP(avgTotal)}
            </span>
          </div>
        ) : null}

        {activeFilters.length > 0 ? (
          <div className="flex flex-wrap items-center gap-1.5">
            {activeFilters.map((f) => (
              <Link
                key={f.key}
                href={urlWithout(f.key)}
                scroll={false}
                className="group inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-2.5 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/10 active:bg-primary/15"
                aria-label={`Quitar filtro ${f.label}`}
              >
                <span className="text-primary/70">{f.label}:</span>
                <span>{f.value}</span>
                <X className="size-3 opacity-60 group-hover:opacity-100" />
              </Link>
            ))}
          </div>
        ) : null}
      </div>

      {totalCount === 0 ? (
        <div className="rounded-lg border bg-white shadow-[0_1px_2px_0_rgb(0_0_0/0.03)]">
          <EmptyState
            icon={<Receipt />}
            title="No hay facturas"
            description={
              activeFilters.length > 0
                ? "No hay facturas que coincidan con los filtros aplicados."
                : "Aún no se ha recibido ninguna factura."
            }
            action={
              activeFilters.length > 0 ? (
                <Button asChild variant="outline" size="sm">
                  <Link href="/facturas">Limpiar filtros</Link>
                </Button>
              ) : undefined
            }
          />
        </div>
      ) : (
        <>
          {/* Mobile: cards */}
          <ul className="md:hidden space-y-2">
            {(invoices ?? []).map((inv) => (
              <li key={inv.id}>
                <Link
                  href={`/facturas/${inv.id}`}
                  className="block rounded-xl border bg-white p-4 shadow-[0_1px_2px_0_rgb(0_0_0/0.03)] active:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-neutral-800 truncate">
                        {inv.supplier_name}
                      </div>
                      <div className="mt-0.5 text-xs text-muted-foreground tabular-nums truncate inline-flex items-center gap-1">
                        {inv.invoice_number}
                        {inv.po_storage_path ? (
                          <Paperclip
                            className="size-3 text-muted-foreground"
                            aria-label="Orden de compra cargada"
                          />
                        ) : null}
                        {inv.supplier_nit ? ` · NIT ${inv.supplier_nit}` : ""}
                      </div>
                    </div>
                    <StatusBadge status={inv.status} />
                  </div>
                  <div className="mt-2 flex items-end justify-between gap-3">
                    <Money
                      value={inv.total_amount}
                      className="text-xl font-bold text-neutral-900"
                    />
                    <div className="flex items-center gap-2">
                      {notesByInvoice.has(inv.id) ? (
                        <InvoiceNotesPopover
                          notes={notesByInvoice.get(inv.id)!}
                        />
                      ) : null}
                      <ApprovalProgress
                        current={inv.current_approvals}
                        required={inv.required_approvals}
                        status={inv.status}
                        size="md"
                      />
                    </div>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    Recibida {formatDateTime(inv.received_at)}
                  </div>
                </Link>
              </li>
            ))}
          </ul>

          {/* Desktop: table */}
          <div className="hidden md:block rounded-lg border bg-white overflow-hidden shadow-[0_1px_2px_0_rgb(0_0_0/0.03)]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <SortableHeader
                      label="Número"
                      field="invoice_number"
                      currentSort={currentSort}
                      searchParams={sp}
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
                      searchParams={sp}
                      pathname="/facturas"
                      align="right"
                    />
                  </TableHead>
                  <TableHead>
                    <SortableHeader
                      label="Recibida"
                      field="received"
                      currentSort={currentSort}
                      searchParams={sp}
                      pathname="/facturas"
                    />
                  </TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Progreso</TableHead>
                  <TableHead className="w-12 text-center">Notas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(invoices ?? []).map((inv) => (
                  <TableRow key={inv.id} className="relative cursor-pointer">
                    <TableCell className="font-medium text-neutral-900 whitespace-nowrap">
                      <Link
                        href={`/facturas/${inv.id}`}
                        className="inline-flex items-center gap-1.5 after:absolute after:inset-0 after:content-[''] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 rounded-sm"
                      >
                        {inv.invoice_number}
                        {inv.po_storage_path ? (
                          <Paperclip
                            className="size-3.5 text-muted-foreground"
                            aria-label="Orden de compra cargada"
                          />
                        ) : null}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{inv.supplier_name}</div>
                      <div className="text-xs text-muted-foreground tabular-nums">
                        NIT {inv.supplier_nit}
                      </div>
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
                    <TableCell>
                      <ApprovalProgress
                        current={inv.current_approvals}
                        required={inv.required_approvals}
                        status={inv.status}
                      />
                    </TableCell>
                    <TableCell className="w-12 text-center">
                      {notesByInvoice.has(inv.id) ? (
                        <InvoiceNotesPopover
                          notes={notesByInvoice.get(inv.id)!}
                        />
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <Pagination
            basePath="/facturas"
            page={currentPage}
            pageSize={PAGE_SIZE}
            total={totalCount}
            searchParams={searchParamsRecord}
          />

          {totalCount > 0 ? (
            <p className="text-xs text-muted-foreground text-center tabular-nums">
              Mostrando {showingFrom.toLocaleString("es-CO")}–
              {showingTo.toLocaleString("es-CO")} de{" "}
              {totalCount.toLocaleString("es-CO")}
            </p>
          ) : null}
        </>
      )}
    </div>
  );
}
