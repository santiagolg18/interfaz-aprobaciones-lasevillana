import Link from "next/link";
import { AlertTriangle, CheckCircle2, Clock, XCircle } from "lucide-react";
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
import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/format";

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

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Vista consolidada del proceso de aprobación.
        </p>
      </div>

      <form className="rounded-lg border bg-white p-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <div className="space-y-1.5">
          <Label htmlFor="from" className="text-xs">Desde</Label>
          <Input id="from" name="from" type="date" defaultValue={from ?? ""} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="to" className="text-xs">Hasta</Label>
          <Input id="to" name="to" type="date" defaultValue={to ?? ""} />
        </div>
        <div className="flex items-center gap-2">
          <Button type="submit">Aplicar</Button>
          {(from || to) ? (
            <Button asChild variant="ghost">
              <Link href="/dashboard">Limpiar</Link>
            </Button>
          ) : null}
        </div>
      </form>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card
          label="Total"
          value={counts.total.toString()}
          icon={<Clock className="size-5" />}
          tint="bg-neutral-50 text-neutral-700"
        />
        <Card
          label="Pendientes"
          value={counts.pending.toString()}
          icon={<AlertTriangle className="size-5" />}
          tint="bg-amber-50 text-amber-700"
        />
        <Card
          label="Aprobadas"
          value={counts.approved.toString()}
          icon={<CheckCircle2 className="size-5" />}
          tint="bg-emerald-50 text-emerald-700"
        />
        <Card
          label="Rechazadas"
          value={counts.rejected.toString()}
          icon={<XCircle className="size-5" />}
          tint="bg-rose-50 text-rose-700"
        />
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <div className="rounded-lg border bg-white p-5">
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Tiempo promedio de aprobación
          </div>
          <div className="mt-2 text-2xl font-semibold">
            {humanizeSeconds(avgSeconds)}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Promedio desde que se recibe la factura hasta que se completa el proceso.
          </p>
        </div>
        <div className="rounded-lg border bg-white p-5">
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Monto total aprobado
          </div>
          <div className="mt-2 text-2xl font-semibold">
            <Money value={totalApprovedAmount} />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Suma de las facturas con estado aprobado dentro del rango seleccionado.
          </p>
        </div>
      </div>

      <div className="rounded-lg border bg-white overflow-hidden">
        <div className="px-4 py-3 border-b">
          <h2 className="text-sm font-semibold">Pendientes más antiguas</h2>
          <p className="text-xs text-muted-foreground">
            Facturas aún en estado pendiente, ordenadas por fecha de recepción.
          </p>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Número</TableHead>
              <TableHead>Proveedor</TableHead>
              <TableHead className="text-right">Monto</TableHead>
              <TableHead>Recibida</TableHead>
              <TableHead>Progreso</TableHead>
              <TableHead>Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(oldest ?? []).length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-16 text-center text-muted-foreground">
                  No hay facturas pendientes en el rango seleccionado.
                </TableCell>
              </TableRow>
            ) : (
              (oldest ?? []).map((inv) => (
                <TableRow key={inv.id} className="hover:bg-neutral-50">
                  <TableCell className="font-medium">
                    <Link href={`/facturas/${inv.id}`}>{inv.invoice_number}</Link>
                  </TableCell>
                  <TableCell>{inv.supplier_name}</TableCell>
                  <TableCell className="text-right">
                    <Money value={inv.total_amount} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDateTime(inv.received_at)}
                  </TableCell>
                  <TableCell className="tabular-nums text-sm">
                    {inv.current_approvals}/{inv.required_approvals}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={inv.status} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function Card({
  label,
  value,
  icon,
  tint,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  tint: string;
}) {
  return (
    <div className="rounded-lg border bg-white p-5">
      <div className="flex items-center justify-between">
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </div>
        <div
          className={`flex size-8 items-center justify-center rounded-md ${tint}`}
        >
          {icon}
        </div>
      </div>
      <div className="mt-2 text-2xl font-semibold tabular-nums">{value}</div>
    </div>
  );
}
