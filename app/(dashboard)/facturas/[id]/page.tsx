import { notFound, redirect } from "next/navigation";
import { CheckCircle2, Clock, FileCheck2, UserX, XCircle } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Money } from "@/components/money";
import { StatusBadge } from "@/components/status-badge";
import { ApprovalProgress } from "@/components/approval-progress";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { FlashToast } from "@/components/flash-toast";
import { InvoiceDocuments } from "@/components/invoice-documents";
import { ApprovalActions } from "@/components/approval-actions";
import { ConfigureApproversDialog } from "@/components/configure-approvers-dialog";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { formatDate, formatDateTime } from "@/lib/format";
import { getSignedStorageUrl } from "@/lib/supabase/storage";
import { configureInvoiceApprovers } from "./actions";

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

export default async function FacturaDetallePage({ params }: { params: Params }) {
  const { id } = await params;
  const me = await getCurrentUser();
  if (!me) redirect("/login");

  const supabase = await createClient();

  const { data: invoice } = await supabase
    .from("invoices")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!invoice) notFound();

  const { data: approvals } = await supabase
    .from("approvals")
    .select("id, status, approved_at, notes, created_at, approver_id, approvers(name, email)")
    .eq("invoice_id", id)
    .order("created_at", { ascending: true });

  const myApproval = me.profile
    ? (approvals ?? []).find((a) => a.approver_id === me.profile!.id) ?? null
    : null;

  // Approvers solo pueden ver facturas a las que están asignados.
  if (me.role === "approver" && !myApproval) {
    redirect("/mis-aprobaciones");
  }

  const canManagePO = me.role === "admin" || me.role === "purchasing";
  const canConfigureApprovers =
    (me.role === "admin" || me.role === "purchasing") &&
    invoice.status === "pending";

  const currentAssignments = (approvals ?? []).map((a) => ({
    approverId: a.approver_id,
    status: a.status,
  }));

  let dialogApprovers: { id: string; name: string; email: string }[] = [];
  if (canConfigureApprovers) {
    const assignedIds = currentAssignments.map((a) => a.approverId);
    const { data: allApprovers } = await supabase
      .from("approvers")
      .select("id, name, email, is_active")
      .order("name");
    dialogApprovers = (allApprovers ?? [])
      .filter((a) => a.is_active || assignedIds.includes(a.id))
      .map(({ id, name, email }) => ({ id, name, email }));
  }

  const hasApprovals = (approvals ?? []).length > 0;

  // En móvil, ordenar mi aprobación primero para que el usuario actual la vea de inmediato.
  const myApproverId = me.profile?.id ?? null;
  const sortedApprovals = myApproverId
    ? [...(approvals ?? [])].sort((a, b) => {
        if (a.approver_id === myApproverId) return -1;
        if (b.approver_id === myApproverId) return 1;
        return 0;
      })
    : (approvals ?? []);

  const [originalUrl, finalUrl, poUrl] = await Promise.all([
    getSignedStorageUrl(
      invoice.pdf_storage_path ?? `${invoice.invoice_number}.pdf`,
    ),
    getSignedStorageUrl(invoice.final_pdf_path),
    getSignedStorageUrl(invoice.po_storage_path),
  ]);

  const showMobileStickyBar = Boolean(myApproval && myApproval.status === "pending");

  return (
    <div className={`space-y-5 ${showMobileStickyBar ? "pb-28 lg:pb-0" : ""}`}>
      <FlashToast />
      <PageHeader
        backHref={me.role === "approver" ? "/mis-aprobaciones" : "/facturas"}
        backLabel={
          me.role === "approver" ? "Volver a mis aprobaciones" : "Volver a facturas"
        }
        title={<>Factura {invoice.invoice_number}</>}
        description={
          <>
            {invoice.supplier_name} · NIT {invoice.supplier_nit}
          </>
        }
        actions={
          finalUrl ? (
            <Button asChild variant="outline" size="sm">
              <a href={finalUrl} target="_blank" rel="noreferrer">
                <FileCheck2 className="size-4" />
                Ver PDF aprobado
              </a>
            </Button>
          ) : null
        }
      />

      {showMobileStickyBar ? (
        <div className="lg:hidden flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-amber-100 text-amber-700">
            <Clock className="size-4" />
          </div>
          <div className="min-w-0 leading-tight">
            <div className="text-sm font-semibold text-amber-900">
              Tu aprobación está pendiente
            </div>
            <div className="text-xs text-amber-800/80 mt-0.5">
              Revisa los documentos y decide con los botones de abajo.
            </div>
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border bg-white px-4 py-3 shadow-[0_1px_2px_0_rgb(0_0_0/0.03)]">
        <StatusBadge status={invoice.status} size="md" />
        <div className="flex min-w-0 items-center gap-2 text-sm">
          <span className="text-muted-foreground">Aprobaciones</span>
          <ApprovalProgress
            current={invoice.current_approvals}
            required={invoice.required_approvals}
            status={invoice.status}
            size="md"
            className="shrink-0"
          />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="order-2 lg:order-none lg:col-span-2 space-y-4">
          <InvoiceDocuments
            invoiceId={invoice.id}
            invoiceNumber={invoice.invoice_number}
            invoiceUrl={originalUrl}
            poUrl={poUrl}
            poStoragePath={invoice.po_storage_path}
            poUploadedAt={invoice.po_uploaded_at}
            canManagePO={canManagePO}
          />

          <div className="rounded-lg border bg-white overflow-hidden shadow-[0_1px_2px_0_rgb(0_0_0/0.03)]">
            <div className="flex items-center justify-between gap-2 px-4 py-3 border-b">
              <h2 className="min-w-0 truncate text-sm font-semibold text-neutral-900">
                Aprobaciones
              </h2>
              <div className="flex shrink-0 items-center gap-3">
                {canConfigureApprovers && hasApprovals ? (
                  <ConfigureApproversDialog
                    invoiceId={invoice.id}
                    supplierName={invoice.supplier_name}
                    currentRequired={invoice.required_approvals}
                    approvers={dialogApprovers}
                    currentAssignments={currentAssignments}
                    action={configureInvoiceApprovers}
                    triggerVariant="ghost"
                  />
                ) : null}
                <ApprovalProgress
                  current={invoice.current_approvals}
                  required={invoice.required_approvals}
                  status={invoice.status}
                />
              </div>
            </div>
            {(approvals ?? []).length === 0 ? (
              <EmptyState
                icon={<UserX />}
                title="Sin aprobadores asignados"
                description="Esta factura aún no tiene aprobadores configurados."
                action={
                  canConfigureApprovers ? (
                    <ConfigureApproversDialog
                      invoiceId={invoice.id}
                      supplierName={invoice.supplier_name}
                      currentRequired={invoice.required_approvals}
                      approvers={dialogApprovers}
                      action={configureInvoiceApprovers}
                    />
                  ) : null
                }
              />
            ) : (
              <>
                {/* Mobile: cards */}
                <ul className="md:hidden divide-y">
                  {sortedApprovals.map((a) => {
                    const isMe = a.approver_id === myApproverId;
                    const meHighlight = isMe
                      ? a.status === "pending"
                        ? "bg-amber-50/50 border-l-2 border-l-amber-400"
                        : a.status === "approved"
                          ? "bg-emerald-50/40 border-l-2 border-l-emerald-400"
                          : "bg-rose-50/40 border-l-2 border-l-rose-400"
                      : "";
                    return (
                      <li
                        key={a.id}
                        className={`p-4 space-y-1.5 ${meHighlight}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-medium text-neutral-900 truncate">
                                {a.approvers?.name ?? "—"}
                              </span>
                              {isMe ? (
                                <span className="shrink-0 rounded-full bg-neutral-900 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                                  Tú
                                </span>
                              ) : null}
                            </div>
                            <div className="text-xs text-muted-foreground truncate">
                              {a.approvers?.email ?? "—"}
                            </div>
                          </div>
                          <StatusBadge status={a.status} className="shrink-0" />
                        </div>
                        {a.approved_at ? (
                          <div className="text-xs text-muted-foreground">
                            {formatDateTime(a.approved_at)}
                          </div>
                        ) : null}
                        {a.notes ? (
                          <div className="text-xs text-neutral-700 whitespace-pre-wrap break-words">
                            {a.notes}
                          </div>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>

                {/* Desktop: table */}
                <div className="hidden md:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Aprobador</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Notas</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(approvals ?? []).map((a) => {
                        const isMe = a.approver_id === myApproverId;
                        return (
                        <TableRow key={a.id}>
                          <TableCell className="font-medium text-neutral-900">
                            <span className="inline-flex items-center gap-1.5">
                              {a.approvers?.name ?? "—"}
                              {isMe ? (
                                <span className="rounded-full bg-neutral-900 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                                  Tú
                                </span>
                              ) : null}
                            </span>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {a.approvers?.email ?? "—"}
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={a.status} />
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                            {formatDateTime(a.approved_at)}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-[240px] truncate">
                            {a.notes ?? "—"}
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
        </div>

        <aside className="order-1 lg:order-none space-y-4">
          {myApproval && myApproval.status === "pending" ? (
            <ApprovalActions invoiceId={invoice.id} approvalId={myApproval.id} />
          ) : null}

          {myApproval && myApproval.status !== "pending" ? (
            <div
              className={`rounded-lg border p-4 shadow-[0_1px_2px_0_rgb(0_0_0/0.03)] ${
                myApproval.status === "approved"
                  ? "border-emerald-200 bg-emerald-50"
                  : "border-rose-200 bg-rose-50"
              }`}
            >
              <div className="flex items-start gap-2.5">
                <div
                  className={`flex size-9 items-center justify-center rounded-md ${
                    myApproval.status === "approved"
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-rose-100 text-rose-700"
                  }`}
                >
                  {myApproval.status === "approved" ? (
                    <CheckCircle2 className="size-4" />
                  ) : (
                    <XCircle className="size-4" />
                  )}
                </div>
                <div className="leading-tight">
                  <div className="text-sm font-semibold text-neutral-900">
                    {myApproval.status === "approved"
                      ? "Ya aprobaste esta factura"
                      : "Ya rechazaste esta factura"}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {formatDateTime(myApproval.approved_at)}
                  </div>
                  {myApproval.notes ? (
                    <p className="text-xs text-neutral-700 mt-1.5 whitespace-pre-wrap">
                      {myApproval.notes}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}

          <div className="rounded-lg border bg-white shadow-[0_1px_2px_0_rgb(0_0_0/0.03)]">
            <div className="px-4 py-3 border-b">
              <h2 className="text-sm font-semibold text-neutral-900">
                Datos de la factura
              </h2>
            </div>
            <div className="px-4 py-3 border-b bg-muted/30">
              <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Total
              </div>
              <div className="mt-0.5 flex items-baseline gap-2">
                <Money
                  value={invoice.total_amount}
                  className="text-2xl font-semibold text-neutral-900"
                />
                <span className="text-xs text-muted-foreground">
                  {invoice.currency ?? "COP"}
                </span>
              </div>
            </div>
            <dl className="divide-y divide-border">
              <DetailRow label="Proveedor" value={invoice.supplier_name} />
              <DetailRow
                label="NIT"
                value={
                  <span className="font-mono tabular-nums text-sm">
                    {invoice.supplier_nit}
                  </span>
                }
              />
              <DetailRow label="Emisión" value={formatDate(invoice.issue_date)} />
              <DetailRow label="Vencimiento" value={formatDate(invoice.due_date)} />
              <DetailRow
                label="Recibida"
                value={formatDateTime(invoice.received_at)}
              />
              {invoice.completed_at ? (
                <DetailRow
                  label="Completada"
                  value={formatDateTime(invoice.completed_at)}
                />
              ) : null}
            </dl>
          </div>

          {invoice.description ? (
            <div className="rounded-lg border bg-white p-4 shadow-[0_1px_2px_0_rgb(0_0_0/0.03)]">
              <h2 className="text-sm font-semibold mb-2 text-neutral-900">
                Descripción
              </h2>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                {invoice.description}
              </p>
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  );
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2.5">
      <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </dt>
      <dd className="text-sm font-medium text-right text-neutral-900">
        {value ?? <span className="text-muted-foreground">—</span>}
      </dd>
    </div>
  );
}
