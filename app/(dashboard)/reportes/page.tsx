import Link from "next/link";
import { FileSpreadsheet, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/page-header";
import { SubmitButton } from "@/components/submit-button";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ from?: string; to?: string }>;

export default async function ReportesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { from, to } = await searchParams;

  const supabase = await createClient();
  await supabase.from("suppliers").select("id, nombre").order("nombre");

  const reports = [
    {
      id: "aprobadas",
      title: "Facturas Aprobadas",
      description:
        "Todas las facturas con estado aprobado: número, proveedor, NIT, monto, fecha de emisión, fecha de aprobación y aprobadores.",
      tint: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    },
    {
      id: "pendientes",
      title: "Facturas Pendientes",
      description:
        "Facturas aún en proceso de aprobación con sus aprobaciones parciales, progreso y días transcurridos.",
      tint: "bg-amber-50 text-amber-700 ring-amber-200",
    },
    {
      id: "rechazadas",
      title: "Facturas Rechazadas",
      description:
        "Facturas rechazadas con el motivo de rechazo, aprobador que rechazó y fecha.",
      tint: "bg-rose-50 text-rose-700 ring-rose-200",
    },
    {
      id: "completo",
      title: "Libro Completo de Facturas",
      description:
        "Reporte maestro con todas las facturas y sus aprobaciones — ideal para contabilidad y auditoría.",
      tint: "bg-blue-50 text-blue-700 ring-blue-200",
    },
    {
      id: "aprobadores",
      title: "Actividad de Aprobadores",
      description:
        "Detalle de cada decisión tomada por aprobador: factura, proveedor, monto, estado y notas.",
      tint: "bg-purple-50 text-purple-700 ring-purple-200",
    },
  ];

  function buildUrl(reportId: string) {
    const params = new URLSearchParams({ reporte: reportId });
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    return `/api/reportes/xlsx?${params.toString()}`;
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Reportes"
        description="Descarga reportes en Excel (.xlsx) para contabilidad y auditoría."
      />

      {/* Filtro de fecha */}
      <form
        method="get"
        className="rounded-lg border bg-white p-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end shadow-[0_1px_2px_0_rgb(0_0_0/0.03)]"
      >
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
              <Link href="/reportes">Limpiar</Link>
            </Button>
          ) : null}
        </div>
      </form>

      {(from || to) && (
        <p className="text-sm text-muted-foreground">
          Filtrando por{" "}
          {from ? (
            <span className="font-medium text-neutral-900">{formatDate(from)}</span>
          ) : (
            "inicio"
          )}{" "}
          →{" "}
          {to ? (
            <span className="font-medium text-neutral-900">{formatDate(to)}</span>
          ) : (
            "hoy"
          )}
          . Los reportes descargados respetarán este rango.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {reports.map((r) => (
          <div
            key={r.id}
            className="flex flex-col gap-4 rounded-lg border bg-white p-5 shadow-[0_1px_2px_0_rgb(0_0_0/0.03)]"
          >
            <div
              className={`flex size-10 items-center justify-center rounded-md ring-1 ring-inset ${r.tint}`}
            >
              <FileSpreadsheet className="size-5" />
            </div>
            <div>
              <h2 className="font-semibold text-sm text-neutral-900">
                {r.title}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                {r.description}
              </p>
            </div>
            <div className="mt-auto">
              <Button asChild size="sm" className="w-full">
                <a href={buildUrl(r.id)} download>
                  <Download className="size-3.5" />
                  Descargar .xlsx
                </a>
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-lg border bg-white p-4 text-sm text-muted-foreground shadow-[0_1px_2px_0_rgb(0_0_0/0.03)]">
        <p className="mb-2 text-sm font-semibold text-neutral-900">
          Notas para contabilidad
        </p>
        <ul className="list-disc list-inside space-y-1">
          <li>Los montos están en pesos colombianos (COP).</li>
          <li>Las fechas se exportan en formato DD/MM/YYYY.</li>
          <li>Cada archivo incluye una hoja por tipo de información.</li>
          <li>
            Si aplicas un filtro de fechas arriba, los reportes solo incluirán
            facturas recibidas en ese rango.
          </li>
        </ul>
      </div>
    </div>
  );
}
