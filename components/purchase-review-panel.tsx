"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  ClipboardCheck,
  Send,
  AlertTriangle,
  Check,
  X,
  Users,
  Loader2,
  Save,
} from "lucide-react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { SubmitButton } from "@/components/submit-button";
import { ReviewDraftProvider } from "@/components/purchase-review-draft-context";
import { timeAgo } from "@/lib/format";
import {
  submitPurchaseReview,
  rejectPurchaseReview,
  savePurchaseReviewDraft,
} from "@/app/(dashboard)/facturas/[id]/review-actions";

// Espera tras el último cambio antes de guardar solo. Suficiente para no
// escribir en cada tecla, corto para que nadie pierda trabajo.
const AUTOSAVE_MS = 2000;

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
  draftSavedAt,
  draftSavedByName,
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
  draftSavedAt: string | null;
  draftSavedByName: string | null;
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
  // Las observaciones son controladas (antes eran un textarea sin estado): hace
  // falta leer el texto para poder guardarlo como borrador.
  const [notes, setNotes] = useState(reviewNotes ?? "");

  const [savedAt, setSavedAt] = useState<string | null>(draftSavedAt);
  const [savedByName, setSavedByName] = useState<string | null>(draftSavedByName);
  const [saveState, setSaveState] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const [saveError, setSaveError] = useState<string | null>(null);

  // Hay cambios sin guardar. Evita que el autoguardado dispare al montar y que
  // se reescriba lo mismo una y otra vez.
  const dirtyRef = useRef(false);
  const savingRef = useRef(false);

  const allRequiredChecked = useMemo(
    () => items.filter((it) => it.is_required).every((it) => checked.has(it.id)),
    [items, checked],
  );

  function toggle(id: string, value: boolean) {
    dirtyRef.current = true;
    setChecked((prev) => {
      const next = new Set(prev);
      if (value) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  const saveDraft = useCallback(
    async (options?: { notify?: boolean }) => {
      if (!editable || savingRef.current) return;
      savingRef.current = true;
      setSaveState("saving");

      const formData = new FormData();
      formData.set("invoice_id", invoiceId);
      formData.set("review_notes", notes);
      for (const id of checked) formData.set(`chk_${id}`, "on");

      // Se marca limpio antes de la respuesta: si el usuario sigue escribiendo
      // mientras guarda, esos cambios quedan pendientes para el próximo ciclo.
      dirtyRef.current = false;
      const result = await savePurchaseReviewDraft(formData);
      savingRef.current = false;

      if (result.ok) {
        setSavedAt(result.savedAt ?? new Date().toISOString());
        setSavedByName(null); // lo acaba de guardar quien está mirando
        setSaveState("saved");
        setSaveError(null);
        if (options?.notify) toast.success("Borrador guardado");
      } else {
        dirtyRef.current = true;
        setSaveState("error");
        setSaveError(result.error ?? "No se pudo guardar el borrador");
        if (options?.notify) toast.error(result.error ?? "No se pudo guardar");
      }
    },
    [checked, notes, editable, invoiceId],
  );

  // Autoguardado: 2 s después del último cambio. `saveState` está en las
  // dependencias a propósito: si el usuario siguió escribiendo mientras un
  // guardado estaba en curso, al terminar este efecto vuelve a correr y agenda
  // el ciclo que recoge esos últimos cambios.
  useEffect(() => {
    if (!editable || !dirtyRef.current) return;
    const timer = setTimeout(() => void saveDraft(), AUTOSAVE_MS);
    return () => clearTimeout(timer);
  }, [checked, notes, editable, saveDraft, saveState]);

  // Refresca la etiqueta "Guardado hace X" mientras la pantalla sigue abierta.
  const [, forceTick] = useState(0);
  useEffect(() => {
    if (!savedAt) return;
    const interval = setInterval(() => forceTick((n) => n + 1), 60_000);
    return () => clearInterval(interval);
  }, [savedAt]);

  // El diálogo de aprobadores recarga la página al guardar; le damos una forma
  // de persistir el borrador justo antes de abrirse.
  const draftSaver = useMemo(
    () => ({
      save: async () => {
        // Si hay un autoguardado en curso se espera a que termine (hasta 3 s)
        // y se guarda de nuevo: así lo último que escribió el usuario queda en
        // la base antes de que el diálogo recargue la página.
        for (let i = 0; i < 60 && savingRef.current; i++) {
          await new Promise((resolve) => setTimeout(resolve, 50));
        }
        await saveDraft();
      },
    }),
    [saveDraft],
  );

  if (!editable) {
    // Modo lectura (auditoría): la factura ya fue liberada o cerrada.
    return (
      <div className="surface overflow-hidden">
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
      className={`surface overflow-hidden ${
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
          <Textarea
            id="review_notes"
            name="review_notes"
            rows={3}
            value={notes}
            onChange={(e) => {
              dirtyRef.current = true;
              setNotes(e.target.value);
            }}
            placeholder="Notas de la revisión, hallazgos o aclaraciones…"
            className="bg-white resize-y"
          />
          <div aria-live="polite" className="text-xs">
            {saveState === "saving" ? (
              <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                <Loader2 className="size-3 animate-spin" />
                Guardando…
              </span>
            ) : saveState === "error" ? (
              <span className="inline-flex flex-wrap items-center gap-1.5 text-rose-700">
                <AlertTriangle className="size-3" />
                {saveError ?? "No se pudo guardar el borrador"}
                <button
                  type="button"
                  onClick={() => void saveDraft({ notify: true })}
                  className="font-medium underline underline-offset-2"
                >
                  Reintentar
                </button>
              </span>
            ) : savedAt ? (
              <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                <Check className="size-3 text-emerald-600" />
                Guardado {timeAgo(savedAt)}
                {savedByName ? ` por ${savedByName}` : ""}
              </span>
            ) : (
              <span className="text-muted-foreground">
                Lo que marques y escribas se guarda solo; puedes dejar la
                revisión a medias y volver después.
              </span>
            )}
          </div>
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
            <ReviewDraftProvider value={draftSaver}>
              {approversDialog}
            </ReviewDraftProvider>
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
          <Button
            type="button"
            variant="outline"
            onClick={() => void saveDraft({ notify: true })}
            disabled={saveState === "saving"}
            className="sm:mr-auto"
          >
            {saveState === "saving" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Save className="size-4" />
            )}
            Guardar borrador
          </Button>
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
