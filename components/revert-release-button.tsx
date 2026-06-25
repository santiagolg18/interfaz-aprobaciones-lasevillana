"use client";

import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { revertRelease } from "@/app/(dashboard)/facturas/lifecycle-actions";

// Botón para revertir la liberación de una factura ya liberada (pending/approved/
// rejected) de vuelta a "En revisión". Solo lo renderiza la UI para admin/compras.
// Descarta los votos de los aprobadores y oculta la factura de /mis-aprobaciones.
export function RevertReleaseButton({ invoiceId }: { invoiceId: string }) {
  return (
    <ConfirmDialog
      title="Revertir a “Por revisar”"
      description="La factura volverá a “Por revisar”, dejará de aparecerle a los aprobadores y se descartarán los votos ya emitidos. Podrás corregir y volver a liberarla."
      confirmLabel="Revertir a “Por revisar”"
      successMessage="La factura volvió a “Por revisar”"
      onConfirm={() => revertRelease(invoiceId)}
      renderTrigger={(open) => (
        <Button
          variant="outline"
          size="sm"
          onClick={open}
          className="gap-1.5"
        >
          <RotateCcw className="size-4" />
          Revertir a “Por revisar”
        </Button>
      )}
    />
  );
}
