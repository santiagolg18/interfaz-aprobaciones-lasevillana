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

export function ApproverToggleButton({
  id,
  name,
  isActive,
  assignedCount,
  action,
}: {
  id: string;
  name: string;
  isActive: boolean;
  assignedCount: number;
  action: (formData: FormData) => void | Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const needsConfirm = isActive && assignedCount > 0;

  if (!needsConfirm) {
    return (
      <form action={action}>
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="next_active" value={isActive ? "false" : "true"} />
        <Button type="submit" variant="ghost" size="sm">
          {isActive ? "Desactivar" : "Activar"}
        </Button>
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
              . Al desactivarlo dejará de aparecer al asignar reglas, pero las
              asignaciones existentes se mantienen.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <form action={action}>
              <input type="hidden" name="id" value={id} />
              <input type="hidden" name="next_active" value="false" />
              <Button type="submit" className="bg-amber-600 hover:bg-amber-700 text-white">
                Sí, desactivar
              </Button>
            </form>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
