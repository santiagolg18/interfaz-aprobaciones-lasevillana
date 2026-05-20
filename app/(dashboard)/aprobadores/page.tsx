import Link from "next/link";
import { Pencil, Plus, Users, UserCheck, UserX, Mail } from "lucide-react";
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
import { StatusBadge } from "@/components/status-badge";
import { ApproverFilters } from "@/components/approver-filters";
import { ApproverToggleButton } from "@/components/approver-toggle-button";
import { createClient } from "@/lib/supabase/server";
import { toggleApproverActive } from "./actions";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  q?: string;
  estado?: string;
  asignacion?: string;
}>;

export default async function AprobadoresPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const estado = sp.estado;
  const asignacion = sp.asignacion;

  const supabase = await createClient();

  let query = supabase
    .from("approvers")
    .select("id, name, email, is_active, approval_rules(count)")
    .order("name");

  if (q) {
    const pattern = `%${q}%`;
    query = query.or(`name.ilike.${pattern},email.ilike.${pattern}`);
  }
  if (estado === "activos") query = query.eq("is_active", true);
  if (estado === "inactivos") query = query.eq("is_active", false);

  const { data: rawApprovers, error } = await query;

  const approvers = (rawApprovers ?? []).map((a) => {
    const rulesCount = Array.isArray(a.approval_rules)
      ? (a.approval_rules[0]?.count ?? 0)
      : 0;
    return { ...a, rulesCount };
  });

  const filtered = approvers.filter((a) => {
    if (asignacion === "con") return a.rulesCount > 0;
    if (asignacion === "sin") return a.rulesCount === 0;
    return true;
  });

  // Stats globales (sin filtros) — pequeñas, en paralelo
  const [
    { count: totalAll },
    { count: totalActivos },
    { count: totalInactivos },
    { data: allWithCounts },
  ] = await Promise.all([
    supabase.from("approvers").select("id", { count: "exact", head: true }),
    supabase
      .from("approvers")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true),
    supabase
      .from("approvers")
      .select("id", { count: "exact", head: true })
      .eq("is_active", false),
    supabase.from("approvers").select("id, approval_rules(count)"),
  ]);

  const totalSinProveedores = (allWithCounts ?? []).filter((a) => {
    const c = Array.isArray(a.approval_rules)
      ? (a.approval_rules[0]?.count ?? 0)
      : 0;
    return c === 0;
  }).length;

  const hasFilters = Boolean(q || estado || asignacion);

  return (
    <div className="space-y-5">
      <FlashToast />

      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Aprobadores</h1>
          <p className="text-sm text-muted-foreground">
            Personas autorizadas para aprobar facturas.
          </p>
        </div>
        <Button asChild>
          <Link href="/aprobadores/new">
            <Plus className="size-4" />
            Nuevo aprobador
          </Link>
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<Users className="size-4" />}
          label="Total"
          value={totalAll ?? 0}
        />
        <StatCard
          icon={<UserCheck className="size-4" />}
          label="Activos"
          value={totalActivos ?? 0}
          hint={
            totalAll
              ? `${Math.round(((totalActivos ?? 0) / totalAll) * 100)}%`
              : undefined
          }
        />
        <StatCard
          icon={<UserX className="size-4" />}
          label="Inactivos"
          value={totalInactivos ?? 0}
        />
        <StatCard
          icon={<Users className="size-4" />}
          label="Sin proveedores"
          value={totalSinProveedores}
          tone={totalSinProveedores > 0 ? "warning" : "default"}
        />
      </div>

      <div className="rounded-lg border bg-white p-4">
        <ApproverFilters />
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
              <TableHead>Aprobador</TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="w-[140px] text-center">Proveedores</TableHead>
              <TableHead className="w-[120px]">Estado</TableHead>
              <TableHead className="w-44 text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="h-32 text-center text-muted-foreground"
                >
                  {hasFilters ? (
                    <div className="space-y-1">
                      <p>No hay aprobadores que coincidan con los filtros.</p>
                      <p className="text-xs">
                        Prueba con otro término o limpia los filtros.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p>Aún no hay aprobadores.</p>
                      <Button asChild size="sm" variant="outline">
                        <Link href="/aprobadores/new">
                          <Plus className="size-4" />
                          Crear el primero
                        </Link>
                      </Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((a) => (
                <TableRow key={a.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar name={a.name} active={!!a.is_active} />
                      <Link
                        href={`/aprobadores/${a.id}`}
                        className="font-medium leading-tight hover:underline"
                      >
                        {a.name}
                      </Link>
                    </div>
                  </TableCell>
                  <TableCell>
                    <a
                      href={`mailto:${a.email}`}
                      className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground hover:underline"
                    >
                      <Mail className="size-3.5" />
                      {a.email}
                    </a>
                  </TableCell>
                  <TableCell className="text-center">
                    {a.rulesCount > 0 ? (
                      <Link
                        href={`/proveedores?approver=${a.id}`}
                        title={`Ver proveedores asignados a ${a.name}`}
                      >
                        <Badge
                          variant="secondary"
                          className="tabular-nums hover:bg-neutral-200"
                        >
                          {a.rulesCount}
                        </Badge>
                      </Link>
                    ) : (
                      <Badge
                        variant="outline"
                        className="text-amber-700 border-amber-200 bg-amber-50"
                      >
                        Sin asignar
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {a.is_active ? (
                      <StatusBadge status="approved" />
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-medium text-neutral-700 ring-1 ring-inset ring-neutral-200">
                        Inactivo
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <ApproverToggleButton
                        id={a.id}
                        name={a.name}
                        isActive={!!a.is_active}
                        assignedCount={a.rulesCount}
                        action={toggleApproverActive}
                      />
                      <Button asChild variant="ghost" size="icon">
                        <Link
                          href={`/aprobadores/${a.id}`}
                          aria-label={`Editar ${a.name}`}
                        >
                          <Pencil className="size-4" />
                        </Link>
                      </Button>
                    </div>
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

function Avatar({ name, active }: { name: string; active: boolean }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
  const palette = active
    ? "bg-primary/10 text-primary"
    : "bg-neutral-100 text-neutral-500";
  return (
    <span
      aria-hidden
      className={`flex size-9 items-center justify-center rounded-full text-xs font-semibold ${palette}`}
    >
      {initials || "?"}
    </span>
  );
}
