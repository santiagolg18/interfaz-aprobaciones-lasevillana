import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileCheck2 } from "lucide-react";
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
import { PdfViewer } from "@/components/pdf-viewer";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatDateTime, storageUrl } from "@/lib/format";

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

export default async function FacturaDetallePage({ params }: { params: Params }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: invoice } = await supabase
    .from("invoices")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!invoice) notFound();

  const { data: approvals } = await supabase
    .from("approvals")
    .select("id, status, approved_at, notes, created_at, approvers(name, email)")
    .eq("invoice_id", id)
    .order("created_at", { ascending: true });

  const originalUrl = storageUrl(
    invoice.pdf_storage_path ?? `${invoice.invoice_number}.pdf`,
  );
  const finalUrl = storageUrl(invoice.final_pdf_path);

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <Button asChild variant="ghost" size="sm" className="-ml-2 mb-1 text-muted-foreground">
            <Link href="/facturas">
              <ArrowLeft className="size-4" />
              Volver a facturas
            </Link>
          </Button>
          <h1 className="text-2xl font-semibold tracking-tight">
            Factura {invoice.invoice_number}
          </h1>
          <p className="text-sm text-muted-foreground">
            {invoice.supplier_name} · NIT {invoice.supplier_nit}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={invoice.status} />
          {finalUrl ? (
            <Button asChild variant="outline" size="sm">
              <a href={finalUrl} target="_blank" rel="noreferrer">
                <FileCheck2 className="size-4" />
                Ver PDF aprobado
              </a>
            </Button>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-lg border bg-white p-4">
            <h2 className="text-sm font-semibold mb-3">Documento original</h2>
            <PdfViewer src={originalUrl} title={`Factura ${invoice.invoice_number}`} />
          </div>

          <div className="rounded-lg border bg-white overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <h2 className="text-sm font-semibold">Aprobaciones</h2>
              <span className="text-xs text-muted-foreground tabular-nums">
                {invoice.current_approvals}/{invoice.required_approvals}
              </span>
            </div>
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
                {(approvals ?? []).length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="h-16 text-center text-muted-foreground"
                    >
                      Sin aprobadores asignados.
                    </TableCell>
                  </TableRow>
                ) : (
                  (approvals ?? []).map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium">
                        {a.approvers?.name ?? "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {a.approvers?.email ?? "—"}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={a.status} />
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDateTime(a.approved_at)}
                      </TableCell>
                      <TableCell className="text-muted-foreground max-w-[240px] truncate">
                        {a.notes ?? "—"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        <aside className="space-y-4">
          <div className="rounded-lg border bg-white p-4 space-y-3">
            <h2 className="text-sm font-semibold">Datos de la factura</h2>
            <DetailRow label="Proveedor" value={invoice.supplier_name} />
            <DetailRow label="NIT" value={invoice.supplier_nit} />
            <DetailRow label="Monto" value={<Money value={invoice.total_amount} />} />
            <DetailRow label="Moneda" value={invoice.currency ?? "COP"} />
            <DetailRow label="Emisión" value={formatDate(invoice.issue_date)} />
            <DetailRow label="Vencimiento" value={formatDate(invoice.due_date)} />
            <DetailRow label="Recibida" value={formatDateTime(invoice.received_at)} />
            <DetailRow label="Completada" value={formatDateTime(invoice.completed_at)} />
          </div>

          {invoice.description ? (
            <div className="rounded-lg border bg-white p-4">
              <h2 className="text-sm font-semibold mb-2">Descripción</h2>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
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
    <div className="flex justify-between gap-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  );
}
