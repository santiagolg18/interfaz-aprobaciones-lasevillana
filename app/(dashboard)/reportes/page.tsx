import Link from "next/link";
import { FileSpreadsheet, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  const { data: suppliers } = await supabase
    .from("suppliers")
    .select("id, nombre")
    .order("nombre");

  const reports = [
    {
      id: "aprobadas",
      title: "Facturas Aprobadas",
      description:
        "Todas las facturas con estado aprobado: número, proveedor, NIT, monto, fecha de emisión, fecha de aprobación y aprobadores.",
      color: "bg-emerald-50 border-emerald-200",
      iconColor: "text-emerald-600",
    },
    {
      id: "pendientes",
      title: "Facturas Pendientes",
      description:
        "Facturas aún en proceso de aprobación con sus aprobaciones parciales, progreso y días transcurridos.",
      color: "bg-amber-50 border-amber-200",
      iconColor: "text-amber-600",
    },
    {
      id: "rechazadas",
      title: "Facturas Rechazadas",
      description:
        "Facturas rechazadas con el motivo de rechazo, aprobador que rechazó y fecha.",
      color: "bg-rose-50 border-rose-200",
      iconColor: "text-rose-600",
    },
    {
      id: "completo",
      title: "Libro Completo de Facturas",
      description:
        "Reporte maestro con todas las facturas y sus aprobaciones — ideal para contabilidad y auditoría.",
      color: "bg-blue-50 border-blue-200",
      iconColor: "text-blue-600",
    },
    {
      id: "aprobadores",
      title: "Actividad de Aprobadores",
      description:
        "Detalle de cada decisión tomada por aprobador: factura, proveedor, monto, estado y notas.",
      color: "bg-purple-50 border-purple-200",
      iconColor: "text-purple-600",
    },
  ];

  function buildUrl(reportId: string) {
    const params = new URLSearchParams({ reporte: reportId });
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    return `/api/reportes/xlsx?${params.toString()}`;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Reportes</h1>
        <p className="text-sm text-muted-foreground">
          Descarga reportes en Excel (.xlsx) para contabilidad y auditoría.
        </p>
      </div>

      {/* Filtro de fecha */}
      <form
        method="get"
        className="rounded-lg border bg-white p-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
      >
        <div className="space-y-1.5">
          <label htmlFor="from" className="text-xs font-medium text-muted-foreground">
            Desde
          </label>
          <input
            id="from"
            name="from"
            type="date"
            defaultValue={from ?? ""}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="to" className="text-xs font-medium text-muted-foreground">
            Hasta
          </label>
          <input
            id="to"
            name="to"
            type="date"
            defaultValue={to ?? ""}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button type="submit">Aplicar</Button>
          {from || to ? (
            <Button asChild variant="ghost">
              <Link href="/reportes">Limpiar</Link>
            </Button>
          ) : null}
        </div>
      </form>

      {(from || to) && (
        <p className="text-xs text-muted-foreground">
          Filtrando por{" "}
          {from ? (
            <span className="font-medium">{formatDate(from)}</span>
          ) : (
            "inicio"
          )}{" "}
          →{" "}
          {to ? (
            <span className="font-medium">{formatDate(to)}</span>
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
            className={`rounded-lg border p-5 flex flex-col gap-3 ${r.color}`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className={`mt-0.5 ${r.iconColor}`}>
                <FileSpreadsheet className="size-5" />
              </div>
            </div>
            <div>
              <h2 className="font-semibold text-sm">{r.title}</h2>
              <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                {r.description}
              </p>
            </div>
            <div className="mt-auto">
              <a href={buildUrl(r.id)} download>
                <Button variant="outline" size="sm" className="w-full bg-white">
                  <Download className="size-3.5" />
                  Descargar .xlsx
                </Button>
              </a>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-lg border bg-white p-4 text-xs text-muted-foreground space-y-1">
        <p className="font-medium text-foreground">Notas para contabilidad</p>
        <ul className="list-disc list-inside space-y-0.5">
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
