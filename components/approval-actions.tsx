"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/submit-button";
import {
  approveInvoice,
  rejectInvoice,
} from "@/app/(dashboard)/facturas/[id]/actions";

export function ApprovalActions({
  invoiceId,
  approvalId,
}: {
  invoiceId: string;
  approvalId: string;
}) {
  const [mode, setMode] = useState<"idle" | "approve" | "reject">("idle");

  if (mode === "idle") {
    return (
      <div className="rounded-lg border bg-white p-4 shadow-[0_1px_2px_0_rgb(0_0_0/0.03)]">
        <div className="mb-3">
          <h2 className="text-sm font-semibold text-neutral-900">
            Tu decisión
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Esta factura está pendiente de tu aprobación.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            className="flex-1 bg-[#16a34a] hover:bg-[#15803d] text-white"
            onClick={() => setMode("approve")}
          >
            <Check className="size-4" />
            Aprobar
          </Button>
          <Button
            type="button"
            variant="outline"
            className="flex-1 border-rose-200 text-rose-700 hover:bg-rose-50 hover:text-rose-800"
            onClick={() => setMode("reject")}
          >
            <X className="size-4" />
            Rechazar
          </Button>
        </div>
      </div>
    );
  }

  const isApprove = mode === "approve";

  return (
    <div className="rounded-lg border bg-white p-4 shadow-[0_1px_2px_0_rgb(0_0_0/0.03)]">
      <div className="mb-3">
        <h2 className="text-sm font-semibold text-neutral-900">
          {isApprove ? "Confirmar aprobación" : "Confirmar rechazo"}
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          {isApprove
            ? "Puedes dejar una nota opcional para el registro."
            : "Indica el motivo del rechazo para que quede registrado."}
        </p>
      </div>

      <form action={isApprove ? approveInvoice : rejectInvoice} className="space-y-3">
        <input type="hidden" name="invoice_id" value={invoiceId} />
        <input type="hidden" name="approval_id" value={approvalId} />

        <div className="space-y-1.5">
          <Label htmlFor="notes">Nota {isApprove ? "(opcional)" : ""}</Label>
          <textarea
            id="notes"
            name="notes"
            rows={3}
            required={!isApprove}
            placeholder={isApprove ? "Todo en orden" : "Motivo del rechazo"}
            className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>

        <div className="flex items-center gap-2 justify-end">
          <Button type="button" variant="ghost" onClick={() => setMode("idle")}>
            Cancelar
          </Button>
          {isApprove ? (
            <SubmitButton
              pendingLabel="Aprobando…"
              className="bg-[#16a34a] hover:bg-[#15803d] text-white"
            >
              <Check className="size-4" />
              Confirmar aprobación
            </SubmitButton>
          ) : (
            <SubmitButton
              pendingLabel="Rechazando…"
              variant="outline"
              className="border-rose-300 text-rose-700 hover:bg-rose-50 hover:text-rose-800"
            >
              <X className="size-4" />
              Confirmar rechazo
            </SubmitButton>
          )}
        </div>
      </form>
    </div>
  );
}
