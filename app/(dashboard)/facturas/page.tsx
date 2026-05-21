import Link from "next/link";
import { Paperclip, Receipt, X } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { InvoiceFilters } from "@/components/invoice-filters";
import { Money } from "@/components/money";
import { StatusBadge } from "@/components/status-badge";
import { ApprovalProgress } from "@/components/approval-progress";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  status?: string;
  supplier_id?: string;
  from?: string;
  to?: string;
}>;

const STATUS_LABEL: Record<string, string> = {
  pending: "Pendiente",
  approved: "Aprobada",
  rejected: "Rechazada",
};

export default async function FacturasPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const { status, supplier_id, from, to } = sp;
  const supabase = await createClient();

  let query = supabase
    .from("invoices")
    .select(
      "id, invoice_number, supplier_id, supplier_name, supplier_nit, total_amount, received_at, status, current_approvals, required_approvals, po_storage_path",
    )
    .order("received_at", { ascending: false });

  if (status) query = query.eq("status", status);
  if (supplier_id) query = query.eq("supplier_id", supplier_id);
  if (from) query = query.gte("received_at", `${from}T00:00:00Z`);
  if (to) query = query.lte("received_at", `${to}T23:59:59Z`);

  const [{ data: invoices, error }, { data: suppliers }] = await Promise.all([
    query,
    supabase.from("suppliers").select("id, nombre").order("nombre"),
  ]);

  const total = (invoices ?? []).length;
  const supplierMap = new Map((suppliers ?? []).map((s) => [s.id, s.nombre]));

  // Construir lista de filtros activos para chips
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

  function urlWithout(keyToRemove: string) {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) {
      if (k === keyToRemove || !v) continue;
      params.set(k, v as string);
    }
    const qs = params.toString();
    return qs ? `/facturas?${qs}` : "/facturas";
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Facturas"
        description="Facturas recibidas y su estado de aprobación."
      />

      <div className="rounded-lg border bg-white p-4 shadow-[0_1px_2px_0_rgb(0_0_0/0.03)]">
        <InvoiceFilters suppliers={suppliers ?? []} />
      </div>

      {error ? (
        <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          Error al cargar facturas: {error.message}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-muted-foreground">
          <span className="font-semibold text-neutral-900 tabular-nums">{total}</span>{" "}
          {total === 1 ? "factura" : "facturas"}
        </span>
        {activeFilters.length > 0 ? (
          <>
            <span className="text-muted-foreground">·</span>
            <div className="flex flex-wrap items-center gap-1.5">
              {activeFilters.map((f) => (
                <Link
                  key={f.key}
                  href={urlWithout(f.key)}
                  scroll={false}
                  className="group inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-2.5 py-0.5 text-xs font-medium text-primary transition-colors hover:bg-primary/10"
                  aria-label={`Quitar filtro ${f.label}`}
                >
                  <span className="text-primary/70">{f.label}:</span>
                  <span>{f.value}</span>
                  <X className="size-3 opacity-60 group-hover:opacity-100" />
                </Link>
              ))}
            </div>
          </>
        ) : null}
      </div>

      <div className="rounded-lg border bg-white overflow-hidden shadow-[0_1px_2px_0_rgb(0_0_0/0.03)]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Número</TableHead>
              <TableHead>Proveedor</TableHead>
              <TableHead className="text-right">Monto</TableHead>
              <TableHead>Recibida</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Progreso</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {total === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={6} className="p-0">
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
                </TableCell>
              </TableRow>
            ) : (
              (invoices ?? []).map((inv) => (
                <TableRow key={inv.id} className="relative cursor-pointer">
                  <TableCell className="font-medium text-neutral-900">
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
                  <TableCell className="text-right">
                    <Money value={inv.total_amount} />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
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
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
