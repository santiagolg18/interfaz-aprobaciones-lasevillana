"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/submit-button";

export function ApproverToggleButton({
  id,
  name,
  isActive,
  assignedCount,
  pendingCount = 0,
  action,
}: {
  id: string;
  name: string;
  isActive: boolean;
  assignedCount: number;
  // Aprobaciones aún sin decidir (pending/blocked): al desactivar, esas
  // facturas quedan frenadas esperando un turno que nunca llegará.
  pendingCount?: number;
  action: (formData: FormData) => void | Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const needsConfirm = isActive && (assignedCount > 0 || pendingCount > 0);

  if (!needsConfirm) {
    return (
      <form action={action}>
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="next_active" value={isActive ? "false" : "true"} />
        <SubmitButton variant="ghost" size="sm" pendingLabel="Guardando…">
          {isActive ? "Desactivar" : "Activar"}
        </SubmitButton>
      </form>
    );
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
      >
        Desactivar
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="flex size-9 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                <AlertTriangle className="size-4" />
              </div>
              <DialogTitle>Desactivar aprobador</DialogTitle>
            </div>
            <DialogDescription className="pt-2">
              <span className="font-medium text-foreground">{name}</span> está
              asignado a{" "}
              <span className="font-medium text-foreground">
                {assignedCount} proveedor{assignedCount === 1 ? "" : "es"}
              </span>
              . Al desactivarlo dejará de aparecer al asignar reglas y perderá
              el acceso a la aplicación.
              {pendingCount > 0 ? (
                <span className="mt-2 block rounded-md bg-amber-50 px-2.5 py-1.5 text-xs font-medium text-amber-800">
                  Atención: tiene {pendingCount} factura
                  {pendingCount === 1 ? "" : "s"} esperando su aprobación.
                  Quedarán frenadas hasta que reasignes esas facturas a otro
                  aprobador o lo reactives.
                </span>
              ) : null}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <form action={action}>
              <input type="hidden" name="id" value={id} />
              <input type="hidden" name="next_active" value="false" />
              <SubmitButton
                className="bg-amber-600 hover:bg-amber-700 text-white"
                pendingLabel="Desactivando…"
              >
                Sí, desactivar
              </SubmitButton>
            </form>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
