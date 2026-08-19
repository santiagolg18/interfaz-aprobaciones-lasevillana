import Link from "next/link";
import { History, Search } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { FlashToast } from "@/components/flash-toast";
import { Pagination } from "@/components/pagination";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormSelect } from "@/components/form-select";
import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/auth/current-user";
import { formatDateTime, formatCOP } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  activityMeta,
  ACTIVITY_FILTER_OPTIONS,
} from "@/components/activity-meta";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 40;

const ROLE_LABEL: Record<string, string> = {
  admin: "Administrador",
  purchasing: "Compras",
  approver: "Aprobador",
};

type SearchParams = Promise<{
  action?: string;
  q?: string;
  page?: string;
}>;

function describeDetails(details: unknown): string | null {
  if (!details || typeof details !== "object") return null;
  const d = details as Record<string, unknown>;
  const parts: string[] = [];
  if (typeof d.notes === "string" && d.notes.trim()) parts.push(`Nota: ${d.notes.trim()}`);
  if (typeof d.review_notes === "string" && d.review_notes.trim())
    parts.push(`Nota: ${d.review_notes.trim()}`);
  if (typeof d.reason === "string" && d.reason.trim())
    parts.push(`Motivo: ${d.reason.trim()}`);
  return parts.length ? parts.join(" · ") : null;
}

export default async function ActividadPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  // Solo admin/compras pueden ver el historial global.
  await requireStaff();

  const sp = await searchParams;
  const action =
    sp.action && ACTIVITY_FILTER_OPTIONS.some((o) => o.value === sp.action)
      ? sp.action
      : undefined;
  const q = sp.q?.trim() || undefined;
  const currentPage = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const offset = (currentPage - 1) * PAGE_SIZE;

  const supabase = await createClient();

  let query = supabase
    .from("invoice_activity_log")
    .select(
      "id, invoice_id, invoice_number, supplier_name, total_amount, action, actor_name, actor_role, details, created_at",
      { count: "exact" },
    );
  if (action) query = query.eq("action", action);
  if (q) {
    const pattern = `%${q}%`;
    query = query.or(
      `invoice_number.ilike.${pattern},supplier_name.ilike.${pattern},actor_name.ilike.${pattern}`,
    );
  }
  query = query
    .order("created_at", { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);

  const { data: events, count } = await query;
  const rows = events ?? [];
  const totalCount = count ?? 0;

  return (
    <div className="space-y-5">
      <FlashToast />
      <PageHeader
        title="Actividad"
        description="Registro de todas las acciones realizadas sobre las facturas."
      />

      {/* Filtros (formulario GET, sin JS) */}
      <form
        method="get"
        className="surface flex flex-col gap-2 p-3 sm:flex-row sm:items-center"
      >
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            name="q"
            defaultValue={q ?? ""}
            placeholder="Buscar por factura, proveedor o responsable"
            className="pl-8"
          />
        </div>
        <FormSelect
          name="action"
          defaultValue={action ?? ""}
          aria-label="Filtrar por tipo de acción"
          className="sm:w-56"
        >
          <option value="">Todas las acciones</option>
          {ACTIVITY_FILTER_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </FormSelect>
        <div className="flex gap-2">
          <Button type="submit" size="sm">
            Filtrar
          </Button>
          {action || q ? (
            <Button asChild variant="ghost" size="sm">
              <Link href="/actividad">Limpiar</Link>
            </Button>
          ) : null}
        </div>
      </form>

      <div className="text-sm text-muted-foreground">
        <span className="font-semibold text-neutral-900 tabular-nums">
          {totalCount.toLocaleString("es-CO")}
        </span>{" "}
        {totalCount === 1 ? "evento" : "eventos"}
      </div>

      {rows.length === 0 ? (
        <div className="surface">
          <EmptyState
            icon={<History />}
            title="Sin actividad"
            description={
              action || q
                ? "No hay eventos que coincidan con los filtros."
                : "Todavía no se han registrado acciones."
            }
          />
        </div>
      ) : (
        <ul className="space-y-2">
          {rows.map((ev) => {
            const meta = activityMeta(ev.action);
            const Icon = meta.Icon;
            const note = describeDetails(ev.details);
            return (
              <li
                key={ev.id}
                className="surface flex gap-3 p-3"
              >
                <span
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-full ring-1 ring-inset [&_svg]:size-4",
                    meta.dotClassName,
                  )}
                >
                  <Icon />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-2">
                    <span className="text-sm font-medium text-neutral-900">
                      {meta.label}
                    </span>
                    <time className="text-xs text-muted-foreground tabular-nums">
                      {formatDateTime(ev.created_at)}
                    </time>
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
                    {ev.invoice_id ? (
                      <Link
                        href={`/facturas/${ev.invoice_id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {ev.invoice_number ?? "Factura"}
                      </Link>
                    ) : (
                      <span className="font-medium text-neutral-700">
                        {ev.invoice_number ?? "Factura"} (eliminada)
                      </span>
                    )}
                    {ev.supplier_name ? <span>· {ev.supplier_name}</span> : null}
                    {ev.total_amount != null ? (
                      <span>· {formatCOP(ev.total_amount)}</span>
                    ) : null}
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    Por {ev.actor_name ?? "Sistema"}
                    {ev.actor_role
                      ? ` · ${ROLE_LABEL[ev.actor_role] ?? ev.actor_role}`
                      : ""}
                  </div>
                  {note ? (
                    <p className="mt-1 rounded-md bg-neutral-50 px-2.5 py-1.5 text-xs text-neutral-700">
                      {note}
                    </p>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {totalCount > PAGE_SIZE ? (
        <Pagination
          basePath="/actividad"
          page={currentPage}
          pageSize={PAGE_SIZE}
          total={totalCount}
          searchParams={{ action, q }}
        />
      ) : null}
    </div>
  );
}
