import Link from "next/link";
import { Pencil, Plus } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { FlashToast } from "@/components/flash-toast";
import { StatusBadge } from "@/components/status-badge";
import { createClient } from "@/lib/supabase/server";
import { toggleApproverActive } from "./actions";

export const dynamic = "force-dynamic";

export default async function AprobadoresPage() {
  const supabase = await createClient();
  const { data: approvers, error } = await supabase
    .from("approvers")
    .select("id, name, email, is_active, approval_rules(count)")
    .order("name");

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

      {error ? (
        <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          {error.message}
        </div>
      ) : null}

      <div className="rounded-lg border bg-white overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="text-center">Proveedores</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="w-40 text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(approvers ?? []).length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  Aún no hay aprobadores. Crea el primero.
                </TableCell>
              </TableRow>
            ) : (
              (approvers ?? []).map((a) => {
                const rulesCount = Array.isArray(a.approval_rules)
                  ? (a.approval_rules[0]?.count ?? 0)
                  : 0;
                return (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.name}</TableCell>
                    <TableCell className="text-muted-foreground">{a.email}</TableCell>
                    <TableCell className="text-center tabular-nums">
                      {rulesCount}
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
                        <form action={toggleApproverActive}>
                          <input type="hidden" name="id" value={a.id} />
                          <input
                            type="hidden"
                            name="next_active"
                            value={a.is_active ? "false" : "true"}
                          />
                          <Button type="submit" variant="ghost" size="sm">
                            {a.is_active ? "Desactivar" : "Activar"}
                          </Button>
                        </form>
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
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
