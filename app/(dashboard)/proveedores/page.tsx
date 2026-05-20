import Link from "next/link";
import { Pencil, Plus, Users, Building2, Mail, Phone, X } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FlashToast } from "@/components/flash-toast";
import { SupplierFilters } from "@/components/supplier-filters";
import { Pagination } from "@/components/pagination";
import { DeleteSupplierButton } from "@/components/delete-supplier-button";
import { createClient } from "@/lib/supabase/server";
import { deleteSupplier } from "./actions";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;

type SearchParams = Promise<{
  q?: string;
  tipo?: string;
  approvers?: string;
  approver?: string;
  page?: string;
}>;

export default async function ProveedoresPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const tipo = sp.tipo;
  const approversFilter = sp.approvers;
  const approverId = sp.approver;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);

  const supabase = await createClient();

  // Si se filtra por un aprobador específico, primero obtenemos los IDs de
  // proveedores asignados (no se puede hacer fácilmente en una sola query
  // sin perder el conteo agregado de approval_rules).
  let restrictToIds: string[] | null = null;
  let approverFilter: { id: string; name: string } | null = null;
  if (approverId) {
    const [rulesRes, approverRes] = await Promise.all([
      supabase
        .from("approval_rules")
        .select("supplier_id")
        .eq("approver_id", approverId),
      supabase
        .from("approvers")
        .select("id, name")
        .eq("id", approverId)
        .maybeSingle(),
    ]);
    restrictToIds = (rulesRes.data ?? []).map((r) => r.supplier_id);
    approverFilter = approverRes.data ?? null;
  }

  let query = supabase
    .from("suppliers")
    .select(
      "id, nit, nombre, tipo, email, telefono, celular, required_approvals, approval_rules(count)",
      { count: "exact" },
    )
    .order("nombre");

  if (q) {
    const pattern = `%${q}%`;
    query = query.or(
      `nombre.ilike.${pattern},nit.ilike.${pattern},email.ilike.${pattern},contacto_facturacion.ilike.${pattern}`,
    );
  }
  if (tipo) query = query.eq("tipo", tipo);
  if (restrictToIds !== null) {
    if (restrictToIds.length === 0) {
      query = query.eq("id", "00000000-0000-0000-0000-000000000000");
    } else {
      query = query.in("id", restrictToIds);
    }
  }

  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;
  query = query.range(from, to);

  const { data: suppliers, error, count } = await query;

  // Filtro client-side por "con/sin aprobadores" (Supabase no permite filtrar
  // por agregados en la misma query fácilmente)
  const filtered = (suppliers ?? []).filter((s) => {
    if (!approversFilter) return true;
    const rulesCount = Array.isArray(s.approval_rules)
      ? (s.approval_rules[0]?.count ?? 0)
      : 0;
    if (approversFilter === "with") return rulesCount > 0;
    if (approversFilter === "without") return rulesCount === 0;
    return true;
  });

  // Stats globales (sin filtros) — pequeñas, en paralelo
  const [{ count: totalAll }, { count: totalPermanente }, { count: totalSinAprobadores }] =
    await Promise.all([
      supabase.from("suppliers").select("id", { count: "exact", head: true }),
      supabase
        .from("suppliers")
        .select("id", { count: "exact", head: true })
        .eq("tipo", "P"),
      supabase
        .from("suppliers")
        .select("id, approval_rules!left(id)", { count: "exact", head: true })
        .is("approval_rules.id", null),
    ]);

  const totalFiltered = count ?? 0;
  const hasFilters = Boolean(q || tipo || approversFilter || approverId);

  function urlWithoutApprover() {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (tipo) params.set("tipo", tipo);
    if (approversFilter) params.set("approvers", approversFilter);
    const qs = params.toString();
    return qs ? `/proveedores?${qs}` : "/proveedores";
  }

  return (
    <div className="space-y-5">
      <FlashToast />

      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Proveedores</h1>
          <p className="text-sm text-muted-foreground">
            Gestiona los proveedores y sus reglas de aprobación.
          </p>
        </div>
        <Button asChild>
          <Link href="/proveedores/new">
            <Plus className="size-4" />
            Nuevo proveedor
          </Link>
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          icon={<Building2 className="size-4" />}
          label="Total"
          value={totalAll ?? 0}
        />
        <StatCard
          icon={<Users className="size-4" />}
          label="Permanentes"
          value={totalPermanente ?? 0}
          hint={
            totalAll
              ? `${Math.round(((totalPermanente ?? 0) / totalAll) * 100)}%`
              : undefined
          }
        />
        <StatCard
          icon={<Users className="size-4" />}
          label="Sin aprobadores"
          value={totalSinAprobadores ?? 0}
          tone={(totalSinAprobadores ?? 0) > 0 ? "warning" : "default"}
        />
      </div>

      <div className="rounded-lg border bg-white p-4 space-y-3">
        {approverFilter ? (
          <div className="flex flex-wrap items-center gap-2 rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-sm">
            <Users className="size-4 text-primary" />
            <span className="text-muted-foreground">Filtrado por aprobador:</span>
            <span className="font-medium">{approverFilter.name}</span>
            <Link
              href={urlWithoutApprover()}
              scroll={false}
              className="ml-auto inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-muted-foreground hover:bg-neutral-100 hover:text-foreground"
              aria-label="Quitar filtro de aprobador"
            >
              <X className="size-3.5" />
              Quitar
            </Link>
          </div>
        ) : null}
        <SupplierFilters />
      </div>

      {error ? (
        <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          {error.message}
        </div>
      ) : null}

      <div className="rounded-lg border bg-white overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[140px]">NIT</TableHead>
              <TableHead>Proveedor</TableHead>
              <TableHead className="w-[140px]">Tipo</TableHead>
              <TableHead className="w-[120px] text-center">Aprobaciones</TableHead>
              <TableHead className="w-[120px] text-center">Aprobadores</TableHead>
              <TableHead className="w-32 text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="h-32 text-center text-muted-foreground"
                >
                  {hasFilters ? (
                    <div className="space-y-1">
                      <p>No hay proveedores que coincidan con los filtros.</p>
                      <p className="text-xs">
                        Prueba con otro término o limpia los filtros.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p>Aún no hay proveedores.</p>
                      <Button asChild size="sm" variant="outline">
                        <Link href="/proveedores/new">
                          <Plus className="size-4" />
                          Crear el primero
                        </Link>
                      </Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((s) => {
                const rulesCount = Array.isArray(s.approval_rules)
                  ? (s.approval_rules[0]?.count ?? 0)
                  : 0;
                const phone = s.celular || s.telefono;
                return (
                  <TableRow key={s.id}>
                    <TableCell className="font-mono text-xs tabular-nums">
                      {s.nit}
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/proveedores/${s.id}`}
                        className="block hover:underline"
                      >
                        <div className="font-medium leading-tight">
                          {s.nombre}
                        </div>
                        {(s.email || phone) && (
                          <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                            {s.email && (
                              <span className="inline-flex items-center gap-1">
                                <Mail className="size-3" />
                                {s.email}
                              </span>
                            )}
                            {phone && phone !== "0" && (
                              <span className="inline-flex items-center gap-1">
                                <Phone className="size-3" />
                                {phone}
                              </span>
                            )}
                          </div>
                        )}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <TipoBadge tipo={s.tipo} />
                    </TableCell>
                    <TableCell className="text-center tabular-nums">
                      {s.required_approvals}
                    </TableCell>
                    <TableCell className="text-center">
                      {rulesCount > 0 ? (
                        <Badge variant="secondary" className="tabular-nums">
                          {rulesCount}
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="text-amber-700 border-amber-200 bg-amber-50"
                        >
                          Sin asignar
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          asChild
                          variant="ghost"
                          size="icon"
                          aria-label={`Editar ${s.nombre}`}
                        >
                          <Link href={`/proveedores/${s.id}`}>
                            <Pencil className="size-4" />
                          </Link>
                        </Button>
                        <DeleteSupplierButton
                          id={s.id}
                          nombre={s.nombre}
                          action={deleteSupplier}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>

        <div className="border-t">
          <Pagination
            basePath="/proveedores"
            page={page}
            pageSize={PAGE_SIZE}
            total={totalFiltered}
            searchParams={{
              q: q || undefined,
              tipo: tipo || undefined,
              approvers: approversFilter || undefined,
              approver: approverId || undefined,
            }}
          />
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  hint,
  tone = "default",
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  hint?: string;
  tone?: "default" | "warning";
}) {
  const toneClass =
    tone === "warning"
      ? "border-amber-200 bg-amber-50"
      : "border-neutral-200 bg-white";
  const iconClass =
    tone === "warning" ? "text-amber-600" : "text-muted-foreground";
  return (
    <div className={`rounded-lg border p-4 ${toneClass}`}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <span className={iconClass}>{icon}</span>
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <p className="text-2xl font-semibold tabular-nums">
          {value.toLocaleString("es-CO")}
        </p>
        {hint && (
          <span className="text-xs text-muted-foreground">{hint}</span>
        )}
      </div>
    </div>
  );
}

function TipoBadge({ tipo }: { tipo: string | null }) {
  if (!tipo) return <span className="text-xs text-muted-foreground">—</span>;
  if (tipo === "P") {
    return (
      <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-emerald-200">
        Permanente
      </Badge>
    );
  }
  if (tipo === "O") {
    return (
      <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 border-blue-200">
        Ocasional
      </Badge>
    );
  }
  return <Badge variant="outline">{tipo}</Badge>;
}
