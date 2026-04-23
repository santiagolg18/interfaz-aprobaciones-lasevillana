import Link from "next/link";
import { ChevronRight } from "lucide-react";
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
import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  status?: string;
  supplier_id?: string;
  from?: string;
  to?: string;
}>;

export default async function FacturasPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { status, supplier_id, from, to } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("invoices")
    .select(
      "id, invoice_number, supplier_id, supplier_name, supplier_nit, total_amount, received_at, status, current_approvals, required_approvals",
    )
    .order("received_at", { ascending: false });

  if (status) query = query.eq("status", status);
  if (supplier_id) query = query.eq("supplier_id", supplier_id);
  if (from) query = query.gte("received_at", `${from}T00:00:00Z`);
  if (to) query = query.lte("received_at", `${to}T23:59:59Z`);

  const [{ data: invoices, error }, { data: suppliers }] = await Promise.all([
    query,
    supabase.from("suppliers").select("id, name").order("name"),
  ]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Facturas</h1>
        <p className="text-sm text-muted-foreground">
          Facturas recibidas y su estado de aprobación.
        </p>
      </div>

      <div className="rounded-lg border bg-white p-4">
        <InvoiceFilters suppliers={suppliers ?? []} />
      </div>

      {error ? (
        <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          Error al cargar facturas: {error.message}
        </div>
      ) : null}

      <div className="rounded-lg border bg-white overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Número</TableHead>
              <TableHead>Proveedor</TableHead>
              <TableHead className="text-right">Monto</TableHead>
              <TableHead>Recibida</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Progreso</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(invoices ?? []).length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  No hay facturas que coincidan con los filtros.
                </TableCell>
              </TableRow>
            ) : (
              (invoices ?? []).map((inv) => (
                <TableRow
                  key={inv.id}
                  className="cursor-pointer hover:bg-neutral-50"
                >
                  <TableCell className="font-medium">
                    <Link href={`/facturas/${inv.id}`} className="block">
                      {inv.invoice_number}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Link href={`/facturas/${inv.id}`} className="block">
                      <div>{inv.supplier_name}</div>
                      <div className="text-xs text-muted-foreground">
                        NIT {inv.supplier_nit}
                      </div>
                    </Link>
                  </TableCell>
                  <TableCell className="text-right">
                    <Link href={`/facturas/${inv.id}`} className="block">
                      <Money value={inv.total_amount} />
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    <Link href={`/facturas/${inv.id}`} className="block">
                      {formatDateTime(inv.received_at)}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Link href={`/facturas/${inv.id}`} className="block">
                      <StatusBadge status={inv.status} />
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Link href={`/facturas/${inv.id}`} className="block">
                      <span className="tabular-nums text-sm">
                        {inv.current_approvals}/{inv.required_approvals}
                      </span>
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/facturas/${inv.id}`}
                      className="flex text-muted-foreground"
                    >
                      <ChevronRight className="size-4" />
                    </Link>
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
