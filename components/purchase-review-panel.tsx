"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { ClipboardCheck, Send, AlertTriangle, Check, X, Users } from "lucide-react";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/status-badge";
import { SubmitButton } from "@/components/submit-button";
import {
  submitPurchaseReview,
  rejectPurchaseReview,
} from "@/app/(dashboard)/facturas/[id]/review-actions";

export type ChecklistItem = {
  id: string;
  label: string;
  description: string | null;
  is_required: boolean;
};

export type ChecklistSnapshotEntry = {
  id: string;
  label: string;
  required: boolean;
  checked: boolean;
};

export type ApproverSummaryEntry = {
  name: string;
  status: string;
};

export function PurchaseReviewPanel({
  invoiceId,
  status,
  items,
  savedResponses,
  reviewNotes,
  approverCount,
  approverSummary,
  approvalMode,
  approversDialog,
}: {
  invoiceId: string;
  status: string | null;
  items: ChecklistItem[];
  savedResponses: ChecklistSnapshotEntry[] | null;
  reviewNotes: string | null;
  approverCount: number;
  approverSummary: ApproverSummaryEntry[];
  approvalMode: "parallel" | "sequential";
  approversDialog: ReactNode;
}) {
  const editable = status === "in_review" || status === "review_rejected";

  // Estado inicial de marcados: desde el snapshot guardado (re-edición tras
  // 'review_rejected'); en una factura nueva, todo desmarcado.
  const initialChecked = useMemo(() => {
    const set = new Set<string>();
    for (const e of savedResponses ?? []) {
      if (e.checked) set.add(e.id);
    }
    return set;
  }, [savedResponses]);

  const [checked, setChecked] = useState<Set<string>>(initialChecked);

  const allRequiredChecked = useMemo(
    () => items.filter((it) => it.is_required).every((it) => checked.has(it.id)),
    [items, checked],
  );

  function toggle(id: string, value: boolean) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (value) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  if (!editable) {
    // Modo lectura (auditoría): la factura ya fue liberada o cerrada.
    return (
      <div className="rounded-lg border bg-white overflow-hidden shadow-[0_1px_2px_0_rgb(0_0_0/0.03)]">
        <div className="flex items-center gap-2 px-4 py-3 border-b">
          <ClipboardCheck className="size-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold text-neutral-900">
            Revisión de compras
          </h2>
        </div>
        <div className="px-4 py-3 space-y-3">
          {savedResponses && savedResponses.length > 0 ? (
            <ul className="grid gap-1.5 sm:grid-cols-2">
              {savedResponses.map((e) => (
                <li
                  key={e.id}
                  className="flex items-center justify-between gap-2 text-sm"
                >
                  <span className="text-neutral-700">
                    {e.label}
                    {e.required ? (
                      <span className="text-rose-500"> *</span>
                    ) : null}
                  </span>
                  {e.checked ? (
                    <Check className="size-4 shrink-0 text-emerald-600" />
                  ) : (
                    <X className="size-4 shrink-0 text-neutral-400" />
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              Sin checklist registrado.
            </p>
          )}
          {reviewNotes ? (
            <div className="rounded-md bg-muted/40 p-3 text-sm text-neutral-700 whitespace-pre-wrap">
              {reviewNotes}
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`rounded-lg border overflow-hidden shadow-[0_1px_2px_0_rgb(0_0_0/0.03)] ${
        status === "review_rejected"
          ? "border-orange-200 bg-orange-50/40"
          : "border-sky-200 bg-sky-50/30"
      }`}
    >
      <div className="flex items-center gap-2 px-4 py-3 border-b bg-white/60">
        <ClipboardCheck className="size-4 text-sky-700" />
        <h2 className="text-sm font-semibold text-neutral-900">
          Revisión de compras
        </h2>
      </div>

      <form className="px-4 py-4 space-y-5">
        <input type="hidden" name="invoice_id" value={invoiceId} />

        {status === "review_rejected" ? (
          <div className="flex items-start gap-2 rounded-md border border-orange-200 bg-orange-50 p-3 text-sm text-orange-900">
            <AlertTriangle className="size-4 shrink-0 mt-0.5" />
            <span>
              Esta factura fue marcada con un problema. Corrige lo pendiente y
              libérala para enviarla a los aprobadores.
            </span>
          </div>
        ) : null}

        {/* Lista de verificación */}
        <div className="space-y-2">
          <Label>Lista de verificación</Label>
          <p className="text-xs text-muted-foreground">
            Los puntos marcados con <span className="text-rose-500">*</span> son
            obligatorios para poder liberar la factura.
          </p>
          {items.length === 0 ? (
            <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
              No hay puntos configurados. Agrégalos en Configuración →
              Checklist.
            </div>
          ) : (
            <ul className="space-y-1.5">
              {items.map((it) => {
                const isChecked = checked.has(it.id);
                return (
                  <li key={it.id}>
                    <label className="flex items-start gap-2.5 rounded-md border bg-white px-3 py-2 cursor-pointer hover:bg-neutral-50">
                      <input
                        type="checkbox"
                        name={`chk_${it.id}`}
                        checked={isChecked}
                        onChange={(e) => toggle(it.id, e.target.checked)}
                        className="mt-0.5 size-4 shrink-0 accent-sky-600"
                      />
                      <span className="leading-tight">
                        <span className="text-sm text-neutral-800">
                          {it.label}
                          {it.is_required ? (
                            <span className="text-rose-500"> *</span>
                          ) : null}
                        </span>
                        {it.description ? (
                          <span className="block text-xs text-muted-foreground">
                            {it.description}
                          </span>
                        ) : null}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Observaciones */}
        <div className="space-y-1.5">
          <Label htmlFor="review_notes">Observaciones</Label>
          <textarea
            id="review_notes"
            name="review_notes"
            rows={3}
            defaultValue={reviewNotes ?? ""}
            placeholder="Notas de la revisión, hallazgos o aclaraciones…"
            className="flex w-full rounded-md border border-input bg-white px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/50 resize-y"
          />
        </div>

        {/* Aprobadores — se configuran aquí mismo y se activan al liberar */}
        <div className="space-y-2 rounded-md border bg-white px-3 py-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Users className="size-4 text-sky-700" />
              <Label className="m-0">Aprobadores</Label>
              <span className="inline-flex items-center rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-medium text-neutral-600 ring-1 ring-inset ring-neutral-200">
                {approvalMode === "sequential" ? "En cascada" : "Independiente"}
              </span>
            </div>
            {approversDialog}
          </div>
          {approverCount === 0 ? (
            <p className="text-xs text-orange-700">
              Configura al menos un aprobador. Se activarán cuando liberes la
              factura.
            </p>
          ) : (
            <ul className="flex flex-wrap gap-1.5">
              {approverSummary.map((a, i) => (
                <li
                  key={`${a.name}-${i}`}
                  className="inline-flex items-center gap-1.5 rounded-md border bg-neutral-50 px-2 py-1 text-xs text-neutral-800"
                >
                  <span className="font-medium">{a.name}</span>
                  <StatusBadge status={a.status} />
                </li>
              ))}
            </ul>
          )}
        </div>

        {approverCount > 0 && !allRequiredChecked ? (
          <p className="text-xs text-orange-700">
            Marca todos los puntos obligatorios para poder liberar.
          </p>
        ) : null}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <SubmitButton
            formAction={rejectPurchaseReview}
            variant="outline"
            pendingLabel="Guardando…"
            className="border-orange-300 text-orange-800 hover:bg-orange-50"
          >
            <AlertTriangle className="size-4" />
            Marcar con problema
          </SubmitButton>
          <SubmitButton
            formAction={submitPurchaseReview}
            disabled={approverCount === 0 || !allRequiredChecked}
            pendingLabel="Liberando…"
          >
            <Send className="size-4" />
            Liberar a aprobadores
          </SubmitButton>
        </div>
      </form>
    </div>
  );
}
