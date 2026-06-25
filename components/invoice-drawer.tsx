"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";

// Envoltura cliente para el detalle de factura mostrado como panel lateral
// (ruta interceptora). Abre por defecto; al cerrar (clic fuera, Esc o la X)
// vuelve a la lista con router.back().
export function InvoiceDrawer({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [open, setOpen] = useState(true);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      // Esperar a la animación de cierre antes de navegar.
      setTimeout(() => router.back(), 180);
    }
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        side="right"
        className="w-full overflow-y-auto p-4 sm:max-w-2xl lg:max-w-3xl sm:p-6"
      >
        <SheetTitle className="sr-only">Detalle de factura</SheetTitle>
        {children}
      </SheetContent>
    </Sheet>
  );
}
