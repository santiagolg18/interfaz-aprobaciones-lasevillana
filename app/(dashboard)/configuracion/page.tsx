import Link from "next/link";
import { KeyRound, Pencil, Plus, Trash2, UserCog } from "lucide-react";
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
import { Avatar } from "@/components/avatar";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { FlashToast } from "@/components/flash-toast";
import { StatusBadge } from "@/components/status-badge";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/current-user";
import { deleteUser } from "./actions";

export const dynamic = "force-dynamic";

export default async function ConfiguracionPage() {
  await requireAdmin();
  const supabase = await createClient();

  const { data: users, error } = await supabase
    .from("approvers")
    .select("id, name, email, role, is_active, auth_user_id")
    .order("role", { ascending: true })
    .order("name", { ascending: true });

  return (
    <div className="space-y-5">
      <FlashToast />

      <PageHeader
        title="Configuración"
        description="Gestiona los usuarios con acceso a la aplicación."
        actions={
          <Button asChild>
            <Link href="/configuracion/new">
              <Plus className="size-4" />
              Nuevo usuario
            </Link>
          </Button>
        }
      />

      {error ? (
        <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          {error.message}
        </div>
      ) : null}

      <div className="rounded-lg border bg-white overflow-hidden shadow-[0_1px_2px_0_rgb(0_0_0/0.03)]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Usuario</TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="w-[130px]">Rol</TableHead>
              <TableHead className="w-[120px]">Estado</TableHead>
              <TableHead className="w-[120px]">Acceso</TableHead>
              <TableHead className="w-44 text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(users ?? []).length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={6} className="p-0">
                  <EmptyState
                    icon={<UserCog />}
                    title="Aún no hay usuarios"
                    description="Crea el primer usuario con acceso a la app."
                    action={
                      <Button asChild size="sm">
                        <Link href="/configuracion/new">
                          <Plus className="size-4" />
                          Crear el primero
                        </Link>
                      </Button>
                    }
                  />
                </TableCell>
              </TableRow>
            ) : (
              (users ?? []).map((u) => (
                <TableRow key={u.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar
                        name={u.name}
                        tone={u.is_active ? "primary" : "muted"}
                      />
                      <span className="font-medium text-neutral-900">
                        {u.name}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {u.email}
                  </TableCell>
                  <TableCell>
                    <RoleBadge role={u.role} />
                  </TableCell>
                  <TableCell>
                    {u.is_active ? (
                      <StatusBadge status="approved" />
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-medium text-neutral-700 ring-1 ring-inset ring-neutral-200">
                        Inactivo
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    {u.auth_user_id ? (
                      <Badge variant="secondary">Con cuenta</Badge>
                    ) : (
                      <Link
                        href={`/configuracion/${u.id}#create-account`}
                        title="Crear cuenta de acceso"
                      >
                        <Badge
                          variant="outline"
                          className="text-amber-700 border-amber-200 bg-amber-50 hover:bg-amber-100 cursor-pointer"
                        >
                          Sin cuenta · crear
                        </Badge>
                      </Link>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button asChild variant="ghost" size="icon" title="Editar">
                        <Link
                          href={`/configuracion/${u.id}`}
                          aria-label={`Editar ${u.name}`}
                        >
                          <Pencil className="size-4" />
                        </Link>
                      </Button>
                      {u.auth_user_id ? (
                        <Button
                          asChild
                          variant="ghost"
                          size="icon"
                          title="Resetear contraseña"
                        >
                          <Link
                            href={`/configuracion/${u.id}#reset-password`}
                            aria-label={`Resetear contraseña de ${u.name}`}
                          >
                            <KeyRound className="size-4" />
                          </Link>
                        </Button>
                      ) : null}
                      <form action={deleteUser}>
                        <input type="hidden" name="id" value={u.id} />
                        <Button
                          type="submit"
                          variant="ghost"
                          size="icon"
                          title="Eliminar"
                          className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </form>
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

function RoleBadge({ role }: { role: string }) {
  if (role === "admin")
    return (
      <Badge className="bg-violet-100 text-violet-700 hover:bg-violet-100 border-0">
        Admin
      </Badge>
    );
  if (role === "purchasing")
    return (
      <Badge className="bg-sky-100 text-sky-700 hover:bg-sky-100 border-0">
        Compras
      </Badge>
    );
  return (
    <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-0">
      Aprobador
    </Badge>
  );
}
