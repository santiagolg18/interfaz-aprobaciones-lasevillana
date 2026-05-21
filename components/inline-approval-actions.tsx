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
import { cn } from "@/lib/utils";

type Mode = "idle" | "approve" | "reject";

type Variant = "compact" | "stacked";

type Props = {
  invoiceId: string;
  approvalId: string;
  invoiceNumber: string;
  supplierName: string;
  variant?: Variant;
};

export function InlineApprovalActions({
  invoiceId,
  approvalId,
  invoiceNumber,
  supplierName,
  variant = "compact",
}: Props) {
  const [mode, setMode] = useState<Mode>("idle");

  const isApprove = mode === "approve";

  function open(next: Mode) {
    return (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setMode(next);
    };
  }

  return (
    <>
      {variant === "compact" ? (
        <div
          className="relative z-10 inline-flex items-center gap-1"
          onClick={(e) => e.stopPropagation()}
        >
          <Button
            type="button"
            size="sm"
            variant="outline"
            aria-label={`Aprobar ${invoiceNumber}`}
            className="h-8 border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
            onClick={open("approve")}
          >
            <Check className="size-4" />
            <span className="sr-only md:not-sr-only md:ml-0">Aprobar</span>
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            aria-label={`Rechazar ${invoiceNumber}`}
            className="h-8 border-rose-200 text-rose-700 hover:bg-rose-50 hover:text-rose-800"
            onClick={open("reject")}
          >
            <X className="size-4" />
            <span className="sr-only md:not-sr-only md:ml-0">Rechazar</span>
          </Button>
        </div>
      ) : (
        <div
          className={cn("relative z-10 mt-3 grid grid-cols-2 gap-2 border-t border-neutral-100 pt-3")}
          onClick={(e) => e.stopPropagation()}
        >
          <Button
            type="button"
            variant="outline"
            className="h-12 border-rose-200 text-base font-medium text-rose-700 hover:bg-rose-50 hover:text-rose-800"
            onClick={open("reject")}
          >
            <X className="size-5" />
            Rechazar
          </Button>
          <Button
            type="button"
            className="h-12 bg-[#16a34a] text-base font-medium text-white hover:bg-[#15803d]"
            onClick={open("approve")}
          >
            <Check className="size-5" />
            Aprobar
          </Button>
        </div>
      )}

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
              Factura{" "}
              <span className="font-medium text-neutral-900">
                {invoiceNumber}
              </span>{" "}
              · {supplierName}
              {isApprove
                ? ". Puedes dejar una nota opcional para el registro."
                : ". Indica el motivo del rechazo para que quede registrado."}
            </DialogDescription>
          </DialogHeader>

          <form
            action={isApprove ? approveInvoice : rejectInvoice}
            className="space-y-3"
          >
            <input type="hidden" name="invoice_id" value={invoiceId} />
            <input type="hidden" name="approval_id" value={approvalId} />

            <div className="space-y-1.5">
              <Label htmlFor={`notes-${approvalId}`}>
                Nota {isApprove ? "(opcional)" : ""}
              </Label>
              <Textarea
                id={`notes-${approvalId}`}
                name="notes"
                rows={4}
                required={!isApprove}
                placeholder={
                  isApprove ? "Todo en orden" : "Motivo del rechazo"
                }
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
