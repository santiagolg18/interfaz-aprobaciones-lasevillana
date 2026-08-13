"use client";

import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { deleteUserById } from "@/app/(dashboard)/configuracion/actions";

// Botón de eliminación de un usuario (Configuración). Elimina también su
// cuenta de acceso; el servidor bloquea el borrado si tiene aprobaciones o
// reglas asociadas.
export function DeleteUserButton({ id, name }: { id: string; name: string }) {
  return (
    <ConfirmDialog
      title="Eliminar usuario"
      description={
        <>
          Vas a eliminar a{" "}
          <span className="font-medium text-foreground">{name}</span> y su
          cuenta de acceso. Esta acción no se puede deshacer. Si el usuario
          tiene aprobaciones o reglas asociadas, no se podrá eliminar
          (desactívalo en su lugar).
        </>
      }
      confirmLabel="Eliminar definitivamente"
      variant="destructive"
      successMessage="Usuario eliminado"
      onConfirm={() => deleteUserById(id)}
      renderTrigger={(open) => (
        <Button
          variant="ghost"
          size="icon"
          title="Eliminar"
          aria-label={`Eliminar ${name}`}
          className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
          onClick={open}
        >
          <Trash2 className="size-4" />
        </Button>
      )}
    />
  );
}
