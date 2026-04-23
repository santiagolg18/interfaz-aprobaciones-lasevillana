import Link from "next/link";
import { Pencil, Plus, Trash2 } from "lucide-react";
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
import { createClient } from "@/lib/supabase/server";
import { deleteSupplier } from "./actions";

export const dynamic = "force-dynamic";

export default async function ProveedoresPage() {
  const supabase = await createClient();
  const { data: suppliers, error } = await supabase
    .from("suppliers")
    .select("id, nit, name, required_approvals, approval_rules(count)")
    .order("name");

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

      {error ? (
        <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          {error.message}
        </div>
      ) : null}

      <div className="rounded-lg border bg-white overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>NIT</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead className="text-center">Aprobaciones requeridas</TableHead>
              <TableHead className="text-center">Aprobadores</TableHead>
              <TableHead className="w-32 text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(suppliers ?? []).length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  Aún no hay proveedores. Crea el primero.
                </TableCell>
              </TableRow>
            ) : (
              (suppliers ?? []).map((s) => {
                const rulesCount = Array.isArray(s.approval_rules)
                  ? (s.approval_rules[0]?.count ?? 0)
                  : 0;
                return (
                  <TableRow key={s.id}>
                    <TableCell className="font-mono text-sm">{s.nit}</TableCell>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell className="text-center tabular-nums">
                      {s.required_approvals}
                    </TableCell>
                    <TableCell className="text-center tabular-nums">
                      {rulesCount}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button asChild variant="ghost" size="icon">
                          <Link
                            href={`/proveedores/${s.id}`}
                            aria-label={`Editar ${s.name}`}
                          >
                            <Pencil className="size-4" />
                          </Link>
                        </Button>
                        <form action={deleteSupplier}>
                          <input type="hidden" name="id" value={s.id} />
                          <Button
                            type="submit"
                            variant="ghost"
                            size="icon"
                            className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                            aria-label={`Eliminar ${s.name}`}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </form>
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
