"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function DeleteSupplierButton({
  id,
  nombre,
  action,
}: {
  id: string;
  nombre: string;
  action: (formData: FormData) => void | Promise<void>;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
        aria-label={`Eliminar ${nombre}`}
        onClick={() => setOpen(true)}
      >
        <Trash2 className="size-4" />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Eliminar proveedor</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de eliminar a{" "}
              <span className="font-medium text-foreground">{nombre}</span>?
              Esta acción no se puede deshacer.
              <br />
              <span className="mt-2 block text-xs text-muted-foreground">
                Si el proveedor tiene facturas asociadas, no podrás eliminarlo.
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <form action={action}>
              <input type="hidden" name="id" value={id} />
              <Button
                type="submit"
                className="bg-rose-600 hover:bg-rose-700 text-white"
              >
                <Trash2 className="size-4" />
                Eliminar
              </Button>
            </form>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
