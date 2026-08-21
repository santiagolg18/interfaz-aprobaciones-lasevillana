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
  iconOnly = false,
}: {
  invoiceId: string;
  action: "archive" | "unarchive";
  /** En tablas se usa solo el icono para no ensanchar la columna de acciones. */
  iconOnly?: boolean;
}) {
  const isArchive = action === "archive";
  const label = isArchive ? "Archivar" : "Restaurar";

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
          size={iconOnly ? "icon-sm" : "sm"}
          onClick={open}
          className={
            iconOnly
              ? "text-muted-foreground hover:text-neutral-900"
              : "gap-1.5 text-muted-foreground hover:text-neutral-900"
          }
          aria-label={label}
          title={
            isArchive ? "Archivar (no requiere aprobación)" : "Devolver a revisión"
          }
        >
          {isArchive ? (
            <Archive className="size-4" />
          ) : (
            <ArchiveRestore className="size-4" />
          )}
          {iconOnly ? null : <span className="hidden sm:inline">{label}</span>}
        </Button>
      )}
    />
  );
}
