import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle2, Clock, Inbox } from "lucide-react";
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
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function MisAprobacionesPage() {
  const me = await getCurrentUser();
  if (!me || !me.profile) redirect("/login");

  const approverId = me.profile.id;
  const supabase = await createClient();

  const [{ data: pending }, { data: history }] = await Promise.all([
    supabase
      .from("approvals")
      .select(
        "id, status, created_at, invoices(id, invoice_number, supplier_name, supplier_nit, total_amount, received_at, status, current_approvals, required_approvals)",
      )
      .eq("approver_id", approverId)
      .eq("status", "pending")
      .order("created_at", { ascending: false }),
    supabase
      .from("approvals")
      .select(
        "id, status, approved_at, invoices(id, invoice_number, supplier_name, total_amount)",
      )
      .eq("approver_id", approverId)
      .neq("status", "pending")
      .order("approved_at", { ascending: false })
      .limit(10),
  ]);

  const pendingRows = (pending ?? []).filter((r) => r.invoices);
  const historyRows = (history ?? []).filter((r) => r.invoices);
  const pendingCount = pendingRows.length;

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

      <div className="grid gap-3 sm:grid-cols-2">
        <StatCard
          icon={<Clock className="size-4" />}
          label="Pendientes"
          value={pendingCount}
          tone={pendingCount > 0 ? "warning" : "default"}
        />
        <StatCard
          icon={<CheckCircle2 className="size-4" />}
          label="Historial reciente"
          value={historyRows.length}
        />
      </div>

      <div className="rounded-lg border bg-white overflow-hidden shadow-[0_1px_2px_0_rgb(0_0_0/0.03)]">
        <div className="px-4 py-3 border-b">
          <h2 className="text-sm font-semibold text-neutral-900">
            Pendientes por aprobar
          </h2>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Número</TableHead>
              <TableHead>Proveedor</TableHead>
              <TableHead className="text-right">Monto</TableHead>
              <TableHead>Recibida</TableHead>
              <TableHead>Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pendingRows.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={5} className="p-0">
                  <EmptyState
                    icon={<Inbox />}
                    title="Nada pendiente"
                    description="Cuando una factura te sea asignada aparecerá aquí."
                  />
                </TableCell>
              </TableRow>
            ) : (
              pendingRows.map((r) => {
                const inv = r.invoices!;
                return (
                  <TableRow key={r.id} className="relative cursor-pointer">
                    <TableCell className="font-medium text-neutral-900">
                      <Link
                        href={`/facturas/${inv.id}`}
                        className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 rounded-sm"
                      >
                        {inv.invoice_number}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{inv.supplier_name}</div>
                      <div className="text-xs text-muted-foreground tabular-nums">
                        NIT {inv.supplier_nit}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Money value={inv.total_amount} />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDateTime(inv.received_at)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={inv.status} />
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {historyRows.length > 0 ? (
        <div className="rounded-lg border bg-white overflow-hidden shadow-[0_1px_2px_0_rgb(0_0_0/0.03)]">
          <div className="px-4 py-3 border-b">
            <h2 className="text-sm font-semibold text-neutral-900">
              Mi historial reciente
            </h2>
          </div>
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
                const inv = r.invoices!;
                return (
                  <TableRow key={r.id} className="relative cursor-pointer">
                    <TableCell className="font-medium text-neutral-900">
                      <Link
                        href={`/facturas/${inv.id}`}
                        className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 rounded-sm"
                      >
                        {inv.invoice_number}
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm">{inv.supplier_name}</TableCell>
                    <TableCell className="text-right">
                      <Money value={inv.total_amount} />
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={r.status} />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDateTime(r.approved_at)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      ) : null}
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
  tone?: "default" | "warning";
}) {
  const toneClass =
    tone === "warning"
      ? "border-amber-200 bg-amber-50"
      : "border-neutral-200 bg-white";
  const iconClass =
    tone === "warning"
      ? "bg-amber-100 text-amber-700"
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
