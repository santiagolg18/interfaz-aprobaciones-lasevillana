import Link from "next/link";
import { Pencil, Settings, Users, UserCheck, UserX, Mail } from "lucide-react";
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
import { Avatar } from "@/components/avatar";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { InfoBanner } from "@/components/info-banner";
import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/auth/current-user";
import { sanitizeSearchTerm } from "@/lib/search";
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
  const me = await requireStaff();
  const sp = await searchParams;
  const q = sanitizeSearchTerm(sp.q ?? "");
  const estado = sp.estado;
  const asignacion = sp.asignacion;

  const isAdmin = me.role === "admin";
  const supabase = await createClient();

  let query = supabase
    .from("approvers")
    .select("id, name, email, is_active, approval_rules(count)")
    .eq("role", "approver")
    .order("name");

  if (q) {
    const pattern = `%${q}%`;
    query = query.or(`name.ilike.${pattern},email.ilike.${pattern}`);
  }
  if (estado === "activos") query = query.eq("is_active", true);
  if (estado === "inactivos") query = query.eq("is_active", false);

  const { data: rawApprovers, error } = await query;

  // Aprobaciones aún sin decidir por aprobador: se muestran como advertencia
  // al desactivar (esas facturas quedarían frenadas esperando su turno).
  const { data: openApprovalRows } = await supabase
    .from("approvals")
    .select("approver_id")
    .in("status", ["pending", "blocked"]);
  const openApprovalsByApprover = new Map<string, number>();
  for (const row of openApprovalRows ?? []) {
    openApprovalsByApprover.set(
      row.approver_id,
      (openApprovalsByApprover.get(row.approver_id) ?? 0) + 1,
    );
  }

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

  // Stats globales (sin filtros) — pequeñas, en paralelo. Solo cuentan aprobadores reales.
  const [
    { count: totalAll },
    { count: totalActivos },
    { count: totalInactivos },
    { data: allWithCounts },
  ] = await Promise.all([
    supabase
      .from("approvers")
      .select("id", { count: "exact", head: true })
      .eq("role", "approver"),
    supabase
      .from("approvers")
      .select("id", { count: "exact", head: true })
      .eq("role", "approver")
      .eq("is_active", true),
    supabase
      .from("approvers")
      .select("id", { count: "exact", head: true })
      .eq("role", "approver")
      .eq("is_active", false),
    supabase
      .from("approvers")
      .select("id, approval_rules(count)")
      .eq("role", "approver"),
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

      <PageHeader
        title="Aprobadores"
        description="Personas autorizadas para aprobar facturas."
        actions={
          isAdmin ? (
            <Button asChild variant="outline">
              <Link href="/configuracion">
                <Settings className="size-4" />
                Gestionar usuarios
              </Link>
            </Button>
          ) : undefined
        }
      />

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

      <div className="surface p-4">
        <ApproverFilters />
      </div>

      {error ? (
        <InfoBanner tone="error">
          {error.message}
        </InfoBanner>
      ) : null}

      {filtered.length === 0 ? (
        <div className="surface">
          <EmptyState
            icon={<Users />}
            title={hasFilters ? "Sin resultados" : "Aún no hay aprobadores"}
            description={
              hasFilters
                ? "No hay aprobadores que coincidan con los filtros. Prueba con otro término o limpia los filtros."
                : isAdmin
                  ? "Crea tu primer aprobador desde Configuración."
                  : "Aún no hay aprobadores. Pídele al admin que cree uno desde Configuración."
            }
            action={
              hasFilters || !isAdmin ? undefined : (
                <Button asChild size="sm">
                  <Link href="/configuracion/new">
                    <Settings className="size-4" />
                    Ir a Configuración
                  </Link>
                </Button>
              )
            }
          />
        </div>
      ) : (
        <>
          {/* Mobile: cards */}
          <ul className="lg:hidden space-y-2">
            {filtered.map((a) => (
              <li
                key={a.id}
                className="surface p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  {/* La edición es solo de admin: para Compras el nombre no es link. */}
                  <MaybeLink
                    href={isAdmin ? `/aprobadores/${a.id}` : null}
                    className="flex items-center gap-3 min-w-0 flex-1"
                  >
                    <Avatar
                      name={a.name}
                      tone={a.is_active ? "primary" : "muted"}
                    />
                    <div className="min-w-0">
                      <div className="font-semibold text-neutral-900 leading-tight truncate">
                        {a.name}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {a.email}
                      </div>
                    </div>
                  </MaybeLink>
                  {a.is_active ? (
                    <StatusBadge status="approved" />
                  ) : (
                    <Badge variant="outline" className="border-neutral-200 bg-neutral-100 text-neutral-600 shrink-0">Inactivo</Badge>
                  )}
                </div>
                <div className="mt-3 flex items-center justify-between gap-3 pt-3 border-t">
                  <div className="text-xs text-muted-foreground">
                    Proveedores:{" "}
                    {a.rulesCount > 0 ? (
                      <Link
                        href={`/proveedores?approver=${a.id}`}
                        className="font-medium text-neutral-900 hover:underline tabular-nums"
                      >
                        {a.rulesCount}
                      </Link>
                    ) : (
                      <span className="font-medium text-amber-700">Sin asignar</span>
                    )}
                  </div>
                  {isAdmin ? (
                    <div className="flex items-center gap-1 shrink-0">
                      <ApproverToggleButton
                        id={a.id}
                        name={a.name}
                        isActive={!!a.is_active}
                        assignedCount={a.rulesCount}
                        pendingCount={openApprovalsByApprover.get(a.id) ?? 0}
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
                  ) : null}
                </div>
              </li>
            ))}
          </ul>

          {/* Desktop: table */}
          <div className="surface hidden lg:block overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Aprobador</TableHead>
                  <TableHead className="lg:w-[200px] xl:w-[280px]">Email</TableHead>
                  <TableHead className="lg:w-[110px] text-center">Proveedores</TableHead>
                  <TableHead className="lg:w-[110px]">Estado</TableHead>
                  <TableHead className="lg:w-24 text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="w-full max-w-0">
                      <div className="flex items-center gap-2.5" title={a.name}>
                        <Avatar
                          name={a.name}
                          tone={a.is_active ? "primary" : "muted"}
                        />
                        {isAdmin ? (
                          <Link
                            href={`/aprobadores/${a.id}`}
                            className="truncate font-medium leading-tight text-neutral-900 hover:underline"
                          >
                            {a.name}
                          </Link>
                        ) : (
                          <span className="truncate font-medium leading-tight text-neutral-900">
                            {a.name}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[160px] xl:max-w-[280px]">
                      <a
                        href={`mailto:${a.email}`}
                        className="flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground hover:underline"
                        title={a.email}
                      >
                        <Mail className="size-3.5 shrink-0" />
                        <span className="truncate">{a.email}</span>
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
                        <Badge variant="outline" className="border-neutral-200 bg-neutral-100 text-neutral-600">Inactivo</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {isAdmin ? (
                        <div className="flex items-center justify-end gap-1">
                          <ApproverToggleButton
                            id={a.id}
                            name={a.name}
                            isActive={!!a.is_active}
                            assignedCount={a.rulesCount}
                            pendingCount={openApprovalsByApprover.get(a.id) ?? 0}
                            action={toggleApproverActive}
                          />
                          <Button asChild variant="ghost" size="icon-sm" title="Editar">
                            <Link
                              href={`/aprobadores/${a.id}`}
                              aria-label={`Editar ${a.name}`}
                            >
                              <Pencil className="size-4" />
                            </Link>
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}

function MaybeLink({
  href,
  className,
  children,
}: {
  href: string | null;
  className?: string;
  children: React.ReactNode;
}) {
  if (!href) return <div className={className}>{children}</div>;
  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}
