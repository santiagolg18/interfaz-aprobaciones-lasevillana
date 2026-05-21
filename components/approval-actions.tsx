"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SubmitButton } from "@/components/submit-button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  approveInvoice,
  rejectInvoice,
} from "@/app/(dashboard)/facturas/[id]/actions";

type Mode = "idle" | "approve" | "reject";

export function ApprovalActions({
  invoiceId,
  approvalId,
}: {
  invoiceId: string;
  approvalId: string;
}) {
  const [mode, setMode] = useState<Mode>("idle");

  const isApprove = mode === "approve";

  return (
    <>
      {/* Desktop card */}
      <div className="hidden lg:block rounded-lg border bg-white p-4 shadow-[0_1px_2px_0_rgb(0_0_0/0.03)]">
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

      {/* Mobile sticky bottom bar */}
      <div className="lg:hidden fixed inset-x-0 bottom-0 z-30 border-t bg-white/95 backdrop-blur px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-2px_8px_rgb(0_0_0/0.06)]">
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            className="flex-1 h-12 border-rose-200 text-rose-700 hover:bg-rose-50 hover:text-rose-800"
            onClick={() => setMode("reject")}
          >
            <X className="size-4" />
            Rechazar
          </Button>
          <Button
            type="button"
            className="flex-1 h-12 bg-[#16a34a] hover:bg-[#15803d] text-white"
            onClick={() => setMode("approve")}
          >
            <Check className="size-4" />
            Aprobar
          </Button>
        </div>
      </div>

      <Dialog
        open={mode !== "idle"}
        onOpenChange={(open) => {
          if (!open) setMode("idle");
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isApprove ? "Confirmar aprobación" : "Confirmar rechazo"}
            </DialogTitle>
            <DialogDescription>
              {isApprove
                ? "Puedes dejar una nota opcional para el registro."
                : "Indica el motivo del rechazo para que quede registrado."}
            </DialogDescription>
          </DialogHeader>

          <form
            action={isApprove ? approveInvoice : rejectInvoice}
            className="space-y-3"
          >
            <input type="hidden" name="invoice_id" value={invoiceId} />
            <input type="hidden" name="approval_id" value={approvalId} />

            <div className="space-y-1.5">
              <Label htmlFor="notes">
                Nota {isApprove ? "(opcional)" : ""}
              </Label>
              <Textarea
                id="notes"
                name="notes"
                rows={4}
                required={!isApprove}
                placeholder={isApprove ? "Todo en orden" : "Motivo del rechazo"}
              />
            </div>

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setMode("idle")}
              >
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
        </DialogContent>
      </Dialog>
    </>
  );
}
