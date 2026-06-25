"use client";

import { Archive, ArchiveRestore } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/confirm-dialog";
import {
  archiveInvoice,
  unarchiveInvoice,
} from "@/app/(dashboard)/facturas/lifecycle-actions";

// Botón de archivar/desarchivar usado en las filas de la lista de facturas.
// Pide confirmación antes de ejecutar para evitar clics accidentales.
export function ArchiveButton({
  invoiceId,
  action,
}: {
  invoiceId: string;
  action: "archive" | "unarchive";
}) {
  const isArchive = action === "archive";

  return (
    <ConfirmDialog
      title={isArchive ? "Archivar factura" : "Restaurar factura"}
      description={
        isArchive
          ? "La factura se moverá a Archivadas y no requerirá revisión ni aprobación. Podrás restaurarla cuando quieras."
          : "La factura volverá a la cola de revisión de compras."
      }
      confirmLabel={isArchive ? "Archivar" : "Restaurar"}
      successMessage={isArchive ? "Factura archivada" : "Factura restaurada"}
      onConfirm={async () =>
        isArchive
          ? await archiveInvoice(invoiceId)
          : await unarchiveInvoice(invoiceId)
      }
      renderTrigger={(open) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={open}
          className="gap-1.5 text-muted-foreground hover:text-neutral-900"
          title={
            isArchive ? "Archivar (no requiere aprobación)" : "Devolver a revisión"
          }
        >
          {isArchive ? (
            <Archive className="size-4" />
          ) : (
            <ArchiveRestore className="size-4" />
          )}
          <span className="hidden sm:inline">
            {isArchive ? "Archivar" : "Restaurar"}
          </span>
        </Button>
      )}
    />
  );
}
