import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Inbox,
  XCircle,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { Money } from "@/components/money";
import { ApprovalProgress } from "@/components/approval-progress";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { SubmitButton } from "@/components/submit-button";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ from?: string; to?: string }>;

function humanizeSeconds(seconds: number): string {
  if (!seconds || seconds <= 0) return "Sin datos";
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  const m = mins % 60;
  if (hrs < 24) return m ? `${hrs} h ${m} min` : `${hrs} h`;
  const days = Math.floor(hrs / 24);
  const h = hrs % 24;
  return h ? `${days} d ${h} h` : `${days} d`;
}

function daysAgo(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return null;
  const diff = Date.now() - then;
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { from, to } = await searchParams;
  const fromIso = from ? `${from}T00:00:00Z` : null;
  const toIso = to ? `${to}T23:59:59Z` : null;

  const supabase = await createClient();

  let statsQuery = supabase
    .from("invoices")
    .select("status, total_amount", { count: "exact" });
  if (fromIso) statsQuery = statsQuery.gte("received_at", fromIso);
  if (toIso) statsQuery = statsQuery.lte("received_at", toIso);

  let oldestQuery = supabase
    .from("invoices")
    .select(
      "id, invoice_number, supplier_name, total_amount, received_at, status, current_approvals, required_approvals",
    )
    .eq("status", "pending")
    .order("received_at", { ascending: true })
    .limit(10);
  if (fromIso) oldestQuery = oldestQuery.gte("received_at", fromIso);
  if (toIso) oldestQuery = oldestQuery.lte("received_at", toIso);

  const [{ data: stats }, { data: oldest }, { data: avgData }] = await Promise.all([
    statsQuery,
    oldestQuery,
    supabase.rpc("avg_approval_seconds", {
      from_ts: fromIso,
      to_ts: toIso,
    }),
  ]);

  const counts = { pending: 0, approved: 0, rejected: 0, total: 0 };
  let totalApprovedAmount = 0;
  for (const row of stats ?? []) {
    counts.total += 1;
    const s = (row.status ?? "pending").toLowerCase();
    if (s === "pending") counts.pending += 1;
    else if (s === "approved") {
      counts.approved += 1;
      totalApprovedAmount += Number(row.total_amount ?? 0);
    } else if (s === "rejected") counts.rejected += 1;
  }

  const avgSeconds = Number(avgData ?? 0);
  const pct = (n: number) =>
    counts.total > 0 ? `${Math.round((n / counts.total) * 100)}% del total` : undefined;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Dashboard"
        description="Vista consolidada del proceso de aprobación."
      />

      <form className="rounded-lg border bg-white p-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end shadow-[0_1px_2px_0_rgb(0_0_0/0.03)]">
        <div className="space-y-1.5">
          <Label htmlFor="from" className="text-sm font-medium">
            Desde
          </Label>
          <Input id="from" name="from" type="date" defaultValue={from ?? ""} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="to" className="text-sm font-medium">
            Hasta
          </Label>
          <Input id="to" name="to" type="date" defaultValue={to ?? ""} />
        </div>
        <div className="flex items-center gap-2">
          <SubmitButton>Aplicar</SubmitButton>
          {from || to ? (
            <Button asChild variant="ghost">
              <Link href="/dashboard">Limpiar</Link>
            </Button>
          ) : null}
        </div>
      </form>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Total"
          value={counts.total.toString()}
          icon={<Clock className="size-5" />}
          tint="bg-neutral-100 text-neutral-700"
        />
        <KpiCard
          label="Pendientes"
          value={counts.pending.toString()}
          hint={pct(counts.pending)}
          icon={<AlertTriangle className="size-5" />}
          tint="bg-amber-50 text-amber-700"
        />
        <KpiCard
          label="Aprobadas"
          value={counts.approved.toString()}
          hint={pct(counts.approved)}
          icon={<CheckCircle2 className="size-5" />}
          tint="bg-emerald-50 text-emerald-700"
        />
        <KpiCard
          label="Rechazadas"
          value={counts.rejected.toString()}
          hint={pct(counts.rejected)}
          icon={<XCircle className="size-5" />}
          tint="bg-rose-50 text-rose-700"
        />
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <div className="rounded-lg border bg-white p-5 shadow-[0_1px_2px_0_rgb(0_0_0/0.03)]">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Tiempo promedio de aprobación
          </div>
          <div className="mt-2 text-2xl font-semibold tabular-nums text-neutral-900">
            {humanizeSeconds(avgSeconds)}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Promedio desde que se recibe la factura hasta que se completa el proceso.
          </p>
        </div>
        <div className="rounded-lg border bg-white p-5 shadow-[0_1px_2px_0_rgb(0_0_0/0.03)]">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Monto total aprobado
          </div>
          <div className="mt-2 text-2xl font-semibold text-neutral-900">
            <Money value={totalApprovedAmount} />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Suma de las facturas con estado aprobado dentro del rango seleccionado.
          </p>
        </div>
      </div>

      <section className="space-y-2">
        <div className="px-1">
          <h2 className="text-sm font-semibold text-neutral-900">
            Pendientes más antiguas
          </h2>
          <p className="text-xs text-muted-foreground">
            Facturas aún en estado pendiente, ordenadas por fecha de recepción.
          </p>
        </div>

        {(oldest ?? []).length === 0 ? (
          <div className="rounded-lg border bg-white shadow-[0_1px_2px_0_rgb(0_0_0/0.03)]">
            <EmptyState
              icon={<Inbox />}
              title="No hay facturas pendientes"
              description="Sin facturas en estado pendiente dentro del rango seleccionado."
            />
          </div>
        ) : (
          <>
            {/* Mobile: cards */}
            <ul className="md:hidden space-y-2">
              {(oldest ?? []).map((inv) => {
                const days = daysAgo(inv.received_at);
                return (
                  <li key={inv.id}>
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
                        <DaysAgoBadge days={days} />
                      </div>
                      <div className="mt-3 flex items-center justify-between gap-3">
                        <Money
                          value={inv.total_amount}
                          className="text-base font-semibold text-neutral-900"
                        />
                        <ApprovalProgress
                          current={inv.current_approvals}
                          required={inv.required_approvals}
                          status={inv.status}
                        />
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {formatDateTime(inv.received_at)}
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
                    <TableHead>Recibida</TableHead>
                    <TableHead>Antigüedad</TableHead>
                    <TableHead>Progreso</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(oldest ?? []).map((inv) => {
                    const days = daysAgo(inv.received_at);
                    return (
                      <TableRow
                        key={inv.id}
                        className="relative cursor-pointer"
                      >
                        <TableCell className="font-medium text-neutral-900 whitespace-nowrap">
                          <Link
                            href={`/facturas/${inv.id}`}
                            className="inline-block after:absolute after:inset-0 after:content-[''] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 rounded-sm"
                          >
                            {inv.invoice_number}
                          </Link>
                        </TableCell>
                        <TableCell className="text-sm">{inv.supplier_name}</TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          <Money value={inv.total_amount} />
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                          {formatDateTime(inv.received_at)}
                        </TableCell>
                        <TableCell>
                          <DaysAgoBadge days={days} />
                        </TableCell>
                        <TableCell>
                          <ApprovalProgress
                            current={inv.current_approvals}
                            required={inv.required_approvals}
                            status={inv.status}
                          />
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={inv.status} />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function KpiCard({
  label,
  value,
  icon,
  tint,
  hint,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  tint: string;
  hint?: string;
}) {
  return (
    <div className="rounded-lg border bg-white p-5 shadow-[0_1px_2px_0_rgb(0_0_0/0.03)]">
      <div className="flex items-center justify-between">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </div>
        <div
          className={cn(
            "flex size-9 items-center justify-center rounded-md",
            tint,
          )}
        >
          {icon}
        </div>
      </div>
      <div className="mt-3 text-3xl font-semibold tabular-nums leading-none text-neutral-900">
        {value}
      </div>
      {hint ? (
        <div className="mt-2 text-xs text-muted-foreground tabular-nums">
          {hint}
        </div>
      ) : null}
    </div>
  );
}

function DaysAgoBadge({ days }: { days: number | null }) {
  if (days === null) return <span className="text-xs text-muted-foreground">—</span>;
  const tone =
    days >= 7
      ? "bg-rose-50 text-rose-700 ring-rose-200"
      : days >= 3
        ? "bg-amber-50 text-amber-700 ring-amber-200"
        : "bg-neutral-50 text-neutral-700 ring-neutral-200";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium tabular-nums ring-1 ring-inset whitespace-nowrap",
        tone,
      )}
    >
      {days === 0 ? "Hoy" : days === 1 ? "1 día" : `${days} días`}
    </span>
  );
}
