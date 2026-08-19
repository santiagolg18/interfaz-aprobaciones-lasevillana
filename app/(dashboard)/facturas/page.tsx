import Link from "next/link";
import { Plus, Receipt, X } from "lucide-react";
import { InvoiceFilters } from "@/components/invoice-filters";
import { InvoiceTabs } from "@/components/invoice-tabs";
import { PrintQueue, type PrintQueueItem } from "@/components/print-queue";
import {
  InvoiceTableSelectable,
} from "@/components/invoice-table-selectable";
import { MobileSortSelect } from "@/components/mobile-sort-select";
import { EmptyState } from "@/components/empty-state";
import { FlashToast } from "@/components/flash-toast";
import { PageHeader } from "@/components/page-header";
import { Pagination } from "@/components/pagination";
import { Button } from "@/components/ui/button";
import type { InvoiceNote } from "@/components/invoice-notes-popover";
import { InfoBanner } from "@/components/info-banner";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getSignedStorageUrl } from "@/lib/supabase/storage";
import {
  applyFrontFilter,
  frontLabel,
  resolveInvoiceScope,
} from "@/lib/invoices/business-front";
import { formatCOP } from "@/lib/format";
import { sanitizeSearchTerm } from "@/lib/search";
import {
  TABS,
  resolveTab,
  tabDef,
  type TabKey,
} from "./tabs";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;
const DEFAULT_SORT = "received_desc";

type SearchParams = Promise<{
  tab?: string;
  supplier_id?: string;
  from?: string;
  to?: string;
  q?: string;
  min?: string;
  max?: string;
  po?: string;
  sort?: string;
  page?: string;
  front?: string;
}>;

const PO_LABEL: Record<string, string> = {
  with: "Con OC",
  without: "Sin OC",
};

const SORT_OPTIONS: { value: string; label: string }[] = [
  { value: "received_desc", label: "Más recientes primero" },
  { value: "received_asc", label: "Más antiguas primero" },
  { value: "amount_desc", label: "Monto mayor primero" },
  { value: "amount_asc", label: "Monto menor primero" },
  { value: "invoice_number_asc", label: "Número (A→Z)" },
  { value: "invoice_number_desc", label: "Número (Z→A)" },
];

function sortToOrder(sort: string): { column: string; ascending: boolean } {
  switch (sort) {
    case "received_asc":
      return { column: "received_at", ascending: true };
    case "amount_desc":
      return { column: "total_amount", ascending: false };
    case "amount_asc":
      return { column: "total_amount", ascending: true };
    case "invoice_number_asc":
      return { column: "invoice_number", ascending: true };
    case "invoice_number_desc":
      return { column: "invoice_number", ascending: false };
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
  const { tab, supplier_id, from, to, q, min, max, po, sort, page, front } = sp;
  const supabase = await createClient();
  const me = await getCurrentUser();
  const canCreateInvoice = me?.role === "admin" || me?.role === "purchasing";
  // Frente de negocio efectivo: Compras queda fijado a su frente; Admin usa el
  // que pida la URL (las dos secciones del menu). null = sin filtro de frente.
  const scope = resolveInvoiceScope(me, front);

  const activeTab = resolveTab(tab);
  const def = tabDef(activeTab);
  const isPrintTab = activeTab === "listas" || activeTab === "completadas";

  const currentSort =
    sort && /^(received|amount|invoice_number)_(asc|desc)$/.test(sort)
      ? sort
      : DEFAULT_SORT;
  const currentPage = Math.max(1, parseInt(page ?? "1", 10) || 1);

  const order = sortToOrder(currentSort);
  const offset = (currentPage - 1) * PAGE_SIZE;
  const qSanitized = q ? sanitizeSearchTerm(q) : "";
  const qPattern = qSanitized ? `%${qSanitized}%` : null;
  const minNum = min && !Number.isNaN(Number(min)) ? Number(min) : null;
  const maxNum = max && !Number.isNaN(Number(max)) ? Number(max) : null;

  // Query principal de la pestaña activa (paginada).
  let query = supabase
    .from("invoices")
    .select(
      "id, invoice_number, supplier_id, supplier_name, supplier_nit, total_amount, received_at, status, current_approvals, required_approvals, po_storage_path, final_pdf_path, pdf_generation_status",
      { count: "exact" },
    );
  if (def.statuses === null) query = query.neq("status", "archived");
  else query = query.in("status", def.statuses);
  query = applyFrontFilter(query, scope);
  if (supplier_id) query = query.eq("supplier_id", supplier_id);
  if (from) query = query.gte("received_at", `${from}T00:00:00-05:00`);
  if (to) query = query.lte("received_at", `${to}T23:59:59-05:00`);
  if (qPattern) {
    query = query.or(
      `invoice_number.ilike.${qPattern},supplier_name.ilike.${qPattern},supplier_nit.ilike.${qPattern}`,
    );
  }
  if (minNum !== null) query = query.gte("total_amount", minNum);
  if (maxNum !== null) query = query.lte("total_amount", maxNum);
  if (po === "with") query = query.not("po_storage_path", "is", null);
  if (po === "without") query = query.is("po_storage_path", null);
  query = query
    .order(order.column, { ascending: order.ascending })
    .range(offset, offset + PAGE_SIZE - 1);

  // Totales (sin paginar) para el mini-resumen de la pestaña actual.
  let totalsQuery = supabase
    .from("invoices")
    .select("total_amount", { count: "exact" });
  if (def.statuses === null) totalsQuery = totalsQuery.neq("status", "archived");
  else totalsQuery = totalsQuery.in("status", def.statuses);
  totalsQuery = applyFrontFilter(totalsQuery, scope);
  if (supplier_id) totalsQuery = totalsQuery.eq("supplier_id", supplier_id);
  if (from) totalsQuery = totalsQuery.gte("received_at", `${from}T00:00:00-05:00`);
  if (to) totalsQuery = totalsQuery.lte("received_at", `${to}T23:59:59-05:00`);
  if (qPattern) {
    totalsQuery = totalsQuery.or(
      `invoice_number.ilike.${qPattern},supplier_name.ilike.${qPattern},supplier_nit.ilike.${qPattern}`,
    );
  }
  if (minNum !== null) totalsQuery = totalsQuery.gte("total_amount", minNum);
  if (maxNum !== null) totalsQuery = totalsQuery.lte("total_amount", maxNum);
  if (po === "with") totalsQuery = totalsQuery.not("po_storage_path", "is", null);
  if (po === "without") totalsQuery = totalsQuery.is("po_storage_path", null);

  // Conteo por pestaña, respetando los filtros agnósticos activos.
  const tabCount = (statuses: string[] | null) => {
    let b = supabase.from("invoices").select("id", { count: "exact", head: true });
    if (statuses === null) b = b.neq("status", "archived");
    else b = b.in("status", statuses);
    b = applyFrontFilter(b, scope);
    if (supplier_id) b = b.eq("supplier_id", supplier_id);
    if (from) b = b.gte("received_at", `${from}T00:00:00-05:00`);
    if (to) b = b.lte("received_at", `${to}T23:59:59-05:00`);
    if (qPattern) {
      b = b.or(
        `invoice_number.ilike.${qPattern},supplier_name.ilike.${qPattern},supplier_nit.ilike.${qPattern}`,
      );
    }
    if (minNum !== null) b = b.gte("total_amount", minNum);
    if (maxNum !== null) b = b.lte("total_amount", maxNum);
    if (po === "with") b = b.not("po_storage_path", "is", null);
    if (po === "without") b = b.is("po_storage_path", null);
    return b;
  };

  const [invoicesResult, suppliersResult, totalsResult, ...tabCountResults] =
    await Promise.all([
      query,
      supabase.from("suppliers").select("id, nombre").order("nombre"),
      totalsQuery,
      ...TABS.map((t) => tabCount(t.statuses)),
    ]);

  const { data: invoices, error, count } = invoicesResult;
  const { data: suppliers } = suppliersResult;
  const { data: totalsData } = totalsResult;

  const counts = TABS.reduce(
    (acc, t, i) => {
      acc[t.key] = tabCountResults[i].count ?? 0;
      return acc;
    },
    {} as Record<TabKey, number>,
  );

  // Notas de aprobadores para las facturas visibles (solo en pestañas con tabla).
  const invoiceIds = (invoices ?? []).map((i) => i.id);
  const { data: notedApprovals } =
    invoiceIds.length && !isPrintTab
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

  // Posibles duplicados: facturas no archivadas que comparten NIT + número con
  // otra. Se calcula sobre el universo no archivado (no solo la página visible)
  // buscando por los números de factura visibles. Cubre también las que entran
  // por correo, que no pasan por el bloqueo de la creación manual.
  const duplicateKeys = new Set<string>();
  if (!isPrintTab && invoiceIds.length > 0) {
    const visibleNumbers = Array.from(
      new Set((invoices ?? []).map((i) => i.invoice_number)),
    );
    const { data: dupRows } = await applyFrontFilter(
      supabase
        .from("invoices")
        .select("supplier_nit, invoice_number")
        .neq("status", "archived")
        .in("invoice_number", visibleNumbers),
      scope,
    );
    const dupCounts = new Map<string, number>();
    for (const r of dupRows ?? []) {
      const key = `${r.supplier_nit}|${r.invoice_number}`;
      dupCounts.set(key, (dupCounts.get(key) ?? 0) + 1);
    }
    for (const [key, n] of dupCounts) if (n > 1) duplicateKeys.add(key);
  }

  // Para las pestañas de impresión: firmar las URLs del PDF final de la página.
  let printItems: PrintQueueItem[] = [];
  if (isPrintTab) {
    printItems = await Promise.all(
      (invoices ?? []).map(async (inv) => {
        const pdfUrl = await getSignedStorageUrl(inv.final_pdf_path);
        return {
          id: inv.id,
          invoice_number: inv.invoice_number,
          supplier_name: inv.supplier_name,
          supplier_nit: inv.supplier_nit,
          total_amount: Number(inv.total_amount ?? 0),
          received_at: inv.received_at,
          pdfUrl,
          pdfReady: Boolean(inv.final_pdf_path) && Boolean(pdfUrl),
          pdfStatus: inv.pdf_generation_status,
        };
      }),
    );
  }

  const totalCount = count ?? 0;
  const sumTotal = (totalsData ?? []).reduce(
    (acc, row) => acc + Number(row.total_amount ?? 0),
    0,
  );

  const supplierMap = new Map((suppliers ?? []).map((s) => [s.id, s.nombre]));

  // Chips de filtros activos
  type ActiveFilter = { key: string; label: string; value: string };
  const activeFilters: ActiveFilter[] = [];
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
    activeFilters.push({ key: "min", label: "Mín.", value: formatCOP(Number(min)) });
  if (max)
    activeFilters.push({ key: "max", label: "Máx.", value: formatCOP(Number(max)) });
  if (po && PO_LABEL[po])
    activeFilters.push({ key: "po", label: "OC", value: PO_LABEL[po] });

  function urlWithout(keyToRemove: string) {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) {
      if (k === keyToRemove || k === "page" || !v) continue;
      params.set(k, v as string);
    }
    const qs = params.toString();
    return qs ? `/facturas?${qs}` : "/facturas";
  }

  const searchParamsRecord: Record<string, string | undefined> = {
    tab: activeTab,
    supplier_id,
    from,
    to,
    q,
    min,
    max,
    po,
    sort: sort && sort !== DEFAULT_SORT ? sort : undefined,
    front: scope ?? undefined,
  };

  const showingFrom = totalCount === 0 ? 0 : offset + 1;
  const showingTo = Math.min(offset + PAGE_SIZE, totalCount);

  const archivable = activeTab === "por_revisar" || activeTab === "archivadas";

  return (
    <div className="space-y-5">
      <FlashToast />
      <PageHeader
        title={scope ? `Facturas · ${frontLabel(scope)}` : "Facturas"}
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

      <InvoiceTabs counts={counts} activeTab={activeTab} searchParams={sp} />

      <div className="surface p-4">
        <InvoiceFilters suppliers={suppliers ?? []} />
      </div>

      {error ? (
        <InfoBanner tone="error">
          Error al cargar facturas: {error.message}
        </InfoBanner>
      ) : null}

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm">
            <span className="font-semibold text-neutral-900 tabular-nums">
              {totalCount.toLocaleString("es-CO")}
            </span>{" "}
            <span className="text-muted-foreground">
              {totalCount === 1 ? "factura" : "facturas"}
              {" · "}
              {def.label}
            </span>
            {totalCount > 0 ? (
              <span className="hidden text-muted-foreground sm:inline">
                {" · Total "}
                <span className="font-semibold text-neutral-900">
                  {formatCOP(sumTotal)}
                </span>
              </span>
            ) : null}
          </div>

          {totalCount > 0 && !isPrintTab ? (
            <div className="md:hidden">
              <MobileSortSelect
                options={SORT_OPTIONS}
                pathname="/facturas"
                defaultValue={DEFAULT_SORT}
              />
            </div>
          ) : null}
        </div>

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
        <div className="surface">
          <EmptyState
            icon={<Receipt />}
            title={`No hay facturas en “${def.label}”`}
            description={
              activeFilters.length > 0
                ? "No hay facturas que coincidan con los filtros aplicados."
                : "Esta etapa no tiene facturas por ahora."
            }
            action={
              activeFilters.length > 0 ? (
                <Button asChild variant="outline" size="sm">
                  <Link
                    href={`/facturas?tab=${activeTab}${scope ? `&front=${scope}` : ""}`}
                  >
                    Limpiar filtros
                  </Link>
                </Button>
              ) : undefined
            }
          />
        </div>
      ) : isPrintTab ? (
        <PrintQueue
          items={printItems}
          mode={activeTab === "listas" ? "ready" : "completed"}
        />
      ) : (
        <InvoiceTableSelectable
          invoices={(invoices ?? []).map((inv) => ({
            id: inv.id,
            invoice_number: inv.invoice_number,
            supplier_name: inv.supplier_name,
            supplier_nit: inv.supplier_nit,
            total_amount: inv.total_amount,
            received_at: inv.received_at,
            status: inv.status,
            current_approvals: inv.current_approvals,
            required_approvals: inv.required_approvals,
            po_storage_path: inv.po_storage_path,
            isDuplicate: duplicateKeys.has(
              `${inv.supplier_nit}|${inv.invoice_number}`,
            ),
          }))}
          notes={Object.fromEntries(notesByInvoice)}
          archivable={archivable}
          activeTab={activeTab}
          canManage={canCreateInvoice}
          currentSort={currentSort}
          searchParams={sp}
        />
      )}

      {totalCount > 0 ? (
        <>
          <Pagination
            basePath="/facturas"
            page={currentPage}
            pageSize={PAGE_SIZE}
            total={totalCount}
            searchParams={searchParamsRecord}
          />
          <p className="text-xs text-muted-foreground text-center tabular-nums">
            Mostrando {showingFrom.toLocaleString("es-CO")}–
            {showingTo.toLocaleString("es-CO")} de{" "}
            {totalCount.toLocaleString("es-CO")}
          </p>
        </>
      ) : null}
    </div>
  );
}
