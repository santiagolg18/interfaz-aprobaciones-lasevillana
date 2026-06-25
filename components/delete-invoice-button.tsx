"use client";

import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { deleteInvoice } from "@/app/(dashboard)/facturas/lifecycle-actions";

// Botón de eliminación PERMANENTE de una factura. Solo lo renderiza la UI para
// admin/compras. Exige un motivo (que queda en el historial) y advierte cuando
// la factura ya fue aprobada o completada (eliminar borra el registro contable).
export function DeleteInvoiceButton({
  invoiceId,
  invoiceNumber,
  status,
  redirectTo,
  variant = "row",
}: {
  invoiceId: string;
  invoiceNumber: string;
  status?: string | null;
  // Si se pasa, tras eliminar se navega ahí (p. ej. desde el detalle).
  redirectTo?: string;
  variant?: "row" | "full";
}) {
  const router = useRouter();
  const isSensitive = status === "approved" || status === "completed";

  return (
    <ConfirmDialog
      title="Eliminar factura"
      description={
        <>
          Vas a eliminar permanentemente la factura{" "}
          <span className="font-medium text-foreground">{invoiceNumber}</span>.
          Esta acción no se puede deshacer; sus archivos también se borrarán.
          Quedará constancia en el historial de actividad.
          {isSensitive ? (
            <span className="mt-2 block rounded-md bg-rose-50 px-2.5 py-1.5 text-xs font-medium text-rose-700">
              Atención: esta factura ya está{" "}
              {status === "completed" ? "completada" : "aprobada"}. Eliminarla
              también borra su registro para contabilidad.
            </span>
          ) : null}
        </>
      }
      confirmLabel="Eliminar definitivamente"
      variant="destructive"
      successMessage="Factura eliminada"
      requireReason
      reasonLabel="Motivo de la eliminación"
      reasonPlaceholder="Ej.: factura duplicada, cargada por error…"
      refreshOnSuccess={!redirectTo}
      onConfirm={async (reason) => {
        const res = await deleteInvoice(invoiceId, reason);
        if (res.ok && redirectTo) router.push(redirectTo);
        return res;
      }}
      renderTrigger={(open) =>
        variant === "full" ? (
          <Button
            variant="outline"
            size="sm"
            onClick={open}
            className="gap-1.5 border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
          >
            <Trash2 className="size-4" />
            Eliminar
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={open}
            className="gap-1.5 text-muted-foreground hover:bg-rose-50 hover:text-rose-700"
            title="Eliminar factura"
          >
            <Trash2 className="size-4" />
            <span className="hidden sm:inline">Eliminar</span>
          </Button>
        )
      }
    />
  );
}
