import Link from "next/link";
import { redirect } from "next/navigation";
import { AlarmClock, CheckCircle2, Clock, Inbox } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Money } from "@/components/money";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { FlashToast } from "@/components/flash-toast";
import { Pagination } from "@/components/pagination";
import { PendingApprovalsList } from "@/components/pending-approvals-list";
import {
  HistoryFilters,
} from "@/components/history-filters";
import type { PendingRow } from "@/components/pending-approvals-list";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

const HISTORY_PAGE_SIZE = 20;

type SearchParams = Promise<{
  q?: string;
  history_status?: string;
  history_from?: string;
  history_to?: string;
  page?: string;
  success?: string;
  error?: string;
}>;

type InvoiceRef = {
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

export default async function MisAprobacionesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const me = await getCurrentUser();
  if (!me || !me.profile) redirect("/login");

  const sp = await searchParams;
  const { history_status, history_from, history_to, page } = sp;
  const approverId = me.profile.id;
  const supabase = await createClient();

  const currentPage = Math.max(1, parseInt(page ?? "1", 10) || 1);
  const offset = (currentPage - 1) * HISTORY_PAGE_SIZE;

  // Historial: query con filtros y paginación.
  let historyQuery = supabase
    .from("approvals")
    .select(
      "id, status, approved_at, invoices(id, invoice_number, supplier_name, supplier_nit, total_amount, received_at, status, current_approvals, required_approvals)",
      { count: "exact" },
    )
    .eq("approver_id", approverId)
    .neq("status", "pending")
    .order("approved_at", { ascending: false });

  if (history_status === "approved" || history_status === "rejected") {
    historyQuery = historyQuery.eq("status", history_status);
  }
  if (history_from)
    historyQuery = historyQuery.gte("approved_at", `${history_from}T00:00:00-05:00`);
  if (history_to)
    historyQuery = historyQuery.lte("approved_at", `${history_to}T23:59:59-05:00`);

  historyQuery = historyQuery.range(offset, offset + HISTORY_PAGE_SIZE - 1);

  const [pendingResult, historyResult] = await Promise.all([
    supabase
      .from("approvals")
      .select(
        "id, status, created_at, invoices(id, invoice_number, supplier_name, supplier_nit, total_amount, received_at, status, current_approvals, required_approvals)",
      )
      .eq("approver_id", approverId)
      .eq("status", "pending")
      .order("created_at", { ascending: false }),
    historyQuery,
  ]);

  type PendingResultRow = {
    id: string;
    created_at: string;
    invoices: InvoiceRef | InvoiceRef[] | null;
  };
  type HistoryResultRow = {
    id: string;
    status: string;
    approved_at: string | null;
    invoices: InvoiceRef | InvoiceRef[] | null;
  };

  function pickInvoice(inv: InvoiceRef | InvoiceRef[] | null): InvoiceRef | null {
    if (!inv) return null;
    if (Array.isArray(inv)) return inv[0] ?? null;
    return inv;
  }

  const pendingRaw = (pendingResult.data ?? []) as PendingResultRow[];
  const historyRaw = (historyResult.data ?? []) as HistoryResultRow[];

  const pendingRows: PendingRow[] = pendingRaw
    .map((r) => {
      const inv = pickInvoice(r.invoices);
      if (!inv) return null;
      return {
        approvalId: r.id,
        createdAt: r.created_at,
        invoice: inv,
      };
    })
    .filter((x): x is PendingRow => x !== null);

  const historyRows = historyRaw
    .map((r) => {
      const inv = pickInvoice(r.invoices);
      if (!inv) return null;
      return {
        approvalId: r.id,
        status: r.status,
        approvedAt: r.approved_at,
        invoice: inv,
      };
    })
    .filter(
      (
        x,
      ): x is {
        approvalId: string;
        status: string;
        approvedAt: string | null;
        invoice: InvoiceRef;
      } => x !== null,
    );

  const pendingCount = pendingRows.length;
  const historyTotal = historyResult.count ?? 0;

  // "Pendientes urgentes" = lleva más de 7 días en cola.
  // Date.now() es legítimo en un Server Component que re-ejecuta en cada request.
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  const urgentCount = pendingRows.filter(
    (r) => (now - new Date(r.createdAt).getTime()) / 86400000 >= 7,
  ).length;

  const searchParamsRecord: Record<string, string | undefined> = {
    history_status,
    history_from,
    history_to,
    q: sp.q,
  };

  return (
    <div className="space-y-5">
      <FlashToast />

      <PageHeader
        title="Mis aprobaciones"
        description={
          pendingCount === 0
            ? "No tienes facturas pendientes por aprobar."
            : `Tienes ${pendingCount} ${pendingCount === 1 ? "factura pendiente" : "facturas pendientes"} por aprobar.`
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          icon={<Clock className="size-4" />}
          label="Pendientes"
          value={pendingCount}
          tone={pendingCount > 0 ? "warning" : "default"}
        />
        <StatCard
          icon={<AlarmClock className="size-4" />}
          label="Urgentes (>7 días)"
          value={urgentCount}
          tone={urgentCount > 0 ? "danger" : "default"}
        />
        <StatCard
          icon={<CheckCircle2 className="size-4" />}
          label="Historial"
          value={historyTotal}
        />
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-neutral-900 px-1">
          Pendientes por aprobar
        </h2>
        {pendingCount === 0 ? (
          <div className="rounded-lg border bg-white shadow-[0_1px_2px_0_rgb(0_0_0/0.03)]">
            <EmptyState
              icon={<Inbox />}
              title="Nada pendiente"
              description="Cuando una factura te sea asignada aparecerá aquí."
            />
          </div>
        ) : (
          <PendingApprovalsList rows={pendingRows} />
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-sm font-semibold text-neutral-900">
            Mi historial
          </h2>
          {historyTotal > 0 ? (
            <span className="text-xs text-muted-foreground tabular-nums">
              {historyTotal.toLocaleString("es-CO")}{" "}
              {historyTotal === 1 ? "decisión" : "decisiones"}
            </span>
          ) : null}
        </div>

        <HistoryFilters />

        {historyTotal === 0 ? (
          <div className="rounded-lg border bg-white shadow-[0_1px_2px_0_rgb(0_0_0/0.03)]">
            <EmptyState
              icon={<CheckCircle2 />}
              title="Sin historial"
              description={
                history_status || history_from || history_to
                  ? "No hay decisiones que coincidan con los filtros."
                  : "Aún no has aprobado ni rechazado facturas."
              }
            />
          </div>
        ) : (
          <>
            {/* Mobile: cards */}
            <ul className="md:hidden space-y-2">
              {historyRows.map((r) => {
                const inv = r.invoice;
                return (
                  <li key={r.approvalId}>
                    <Link
                      href={`/facturas/${inv.id}`}
                      className="block rounded-lg border bg-white p-4 shadow-[0_1px_2px_0_rgb(0_0_0/0.03)] active:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-semibold text-neutral-900">
                            {inv.invoice_number}
                          </div>
                          <div className="text-sm text-neutral-700 truncate">
                            {inv.supplier_name}
                          </div>
                        </div>
                        <StatusBadge status={r.status} />
                      </div>
                      <div className="mt-3 flex items-center justify-between gap-3">
                        <Money
                          value={inv.total_amount}
                          className="text-base font-semibold text-neutral-900"
                        />
                        <div className="text-xs text-muted-foreground">
                          {formatDateTime(r.approvedAt)}
                        </div>
                      </div>
                    </Link>
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
                    <TableHead>Decisión</TableHead>
                    <TableHead>Fecha</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historyRows.map((r) => {
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
                        <TableCell className="text-sm">
                          {inv.supplier_name}
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          <Money value={inv.total_amount} />
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={r.status} />
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                          {formatDateTime(r.approvedAt)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            <Pagination
              basePath="/mis-aprobaciones"
              page={currentPage}
              pageSize={HISTORY_PAGE_SIZE}
              total={historyTotal}
              searchParams={searchParamsRecord}
            />
          </>
        )}
      </section>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  tone = "default",
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  tone?: "default" | "warning" | "danger";
}) {
  const toneClass =
    tone === "warning"
      ? "border-amber-200 bg-amber-50"
      : tone === "danger"
        ? "border-rose-200 bg-rose-50"
        : "border-neutral-200 bg-white";
  const iconClass =
    tone === "warning"
      ? "bg-amber-100 text-amber-700"
      : tone === "danger"
        ? "bg-rose-100 text-rose-700"
        : "bg-neutral-100 text-neutral-600";
  return (
    <div
      className={`rounded-lg border p-4 shadow-[0_1px_2px_0_rgb(0_0_0/0.03)] ${toneClass}`}
    >
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <span
          className={`flex size-8 items-center justify-center rounded-md ${iconClass}`}
        >
          {icon}
        </span>
      </div>
      <p className="mt-3 text-2xl font-semibold tabular-nums text-neutral-900">
        {value.toLocaleString("es-CO")}
      </p>
    </div>
  );
}
