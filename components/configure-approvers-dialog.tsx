"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, Lock, Pencil, UserPlus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { StatusBadge } from "@/components/status-badge";
import { SubmitButton } from "@/components/submit-button";

type Approver = { id: string; name: string; email: string };

type Assignment = { approverId: string; status: string | null };

export function ConfigureApproversDialog({
  invoiceId,
  supplierName,
  currentRequired,
  currentMode = "parallel",
  approvers,
  currentAssignments = [],
  action,
  triggerLabel,
  triggerVariant = "default",
  triggerIcon,
}: {
  invoiceId: string;
  supplierName: string;
  currentRequired: number;
  currentMode?: "parallel" | "sequential";
  approvers: Approver[];
  currentAssignments?: Assignment[];
  action: (formData: FormData) => void | Promise<void>;
  triggerLabel?: string;
  triggerVariant?: "default" | "ghost";
  triggerIcon?: "user-plus" | "pencil";
}) {
  const isEdit = currentAssignments.length > 0;

  const assignmentByApproverId = useMemo(
    () => new Map(currentAssignments.map((a) => [a.approverId, a])),
    [currentAssignments],
  );

  const nameByApproverId = useMemo(
    () => new Map(approvers.map((a) => [a.id, a.name])),
    [approvers],
  );

  // Solo se bloquean (candado) los que ya decidieron. Los 'blocked' (en espera,
  // factura en revisión) y 'pending' se pueden quitar/reordenar libremente.
  const lockedIds = useMemo(
    () =>
      new Set(
        currentAssignments
          .filter((a) => a.status === "approved" || a.status === "rejected")
          .map((a) => a.approverId),
      ),
    [currentAssignments],
  );

  const [open, setOpen] = useState(false);
  // Selección ORDENADA: el orden del arreglo define la cadena de aprobación
  // (modo cascada). El backend asigna approval_order = posición + 1.
  const [selected, setSelected] = useState<string[]>(
    () => currentAssignments.map((a) => a.approverId),
  );
  const [required, setRequired] = useState<number>(
    Math.max(1, currentRequired || 1),
  );
  const [mode, setMode] = useState<"parallel" | "sequential">(
    currentMode === "sequential" ? "sequential" : "parallel",
  );
  const isSequential = mode === "sequential";

  const hasApprovers = approvers.length > 0;
  const selectedCount = selected.length;
  const canSubmit = selectedCount > 0;

  const cappedRequired = useMemo(
    () => (selectedCount > 0 ? Math.min(required, selectedCount) : required),
    [required, selectedCount],
  );

  function toggle(id: string, checked: boolean) {
    if (lockedIds.has(id)) return;
    setSelected((prev) => {
      if (checked) return prev.includes(id) ? prev : [...prev, id];
      return prev.filter((x) => x !== id);
    });
  }

  function move(id: string, dir: -1 | 1) {
    setSelected((prev) => {
      const i = prev.indexOf(id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  const resolvedIcon = triggerIcon ?? (isEdit ? "pencil" : "user-plus");
  const resolvedLabel =
    triggerLabel ?? (isEdit ? "Editar" : "Configurar aprobadores");

  return (
    <>
      <Button size="sm" variant={triggerVariant} onClick={() => setOpen(true)}>
        {resolvedIcon === "pencil" ? (
          <Pencil className="size-4" />
        ) : (
          <UserPlus className="size-4" />
        )}
        {resolvedLabel}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {isEdit ? "Editar aprobadores" : "Configurar aprobadores"}
            </DialogTitle>
            <DialogDescription>
              Esto también {isEdit ? "actualizará" : "guardará"} la configuración
              en el proveedor{" "}
              <span className="font-medium text-foreground">{supplierName}</span>{" "}
              para sus próximas facturas.
            </DialogDescription>
          </DialogHeader>

          <form action={action} className="space-y-5">
            <input type="hidden" name="invoice_id" value={invoiceId} />
            <input
              type="hidden"
              name="required_approvals"
              value={cappedRequired}
            />
            <input type="hidden" name="approval_mode" value={mode} />
            {/* Aprobadores en el ORDEN de la cadena (define approval_order). */}
            {selected.map((id) => (
              <input key={id} type="hidden" name="approver_ids" value={id} />
            ))}

            {/* Modo de aprobación */}
            <div className="space-y-2">
              <Label>Modo de aprobación</Label>
              <div className="grid gap-2 sm:grid-cols-2">
                {[
                  {
                    value: "parallel" as const,
                    title: "Independiente",
                    desc: "Todos los aprobadores a la vez.",
                  },
                  {
                    value: "sequential" as const,
                    title: "En cascada",
                    desc: "Uno tras otro, por orden.",
                  },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setMode(opt.value)}
                    aria-pressed={mode === opt.value}
                    className={
                      "rounded-md border p-3 text-left transition-colors " +
                      (mode === opt.value
                        ? "border-sky-400 bg-sky-50"
                        : "bg-white hover:bg-neutral-50")
                    }
                  >
                    <div className="text-sm font-medium text-neutral-900">
                      {opt.title}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {opt.desc}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {isSequential ? (
              <p className="text-xs text-muted-foreground">
                En cascada deben aprobar todos, en el orden de abajo.
              </p>
            ) : (
              <div className="space-y-1.5 sm:max-w-[180px]">
                <Label htmlFor="required_approvals_input">
                  Aprobaciones requeridas
                </Label>
                <Input
                  id="required_approvals_input"
                  type="number"
                  min={1}
                  max={Math.max(1, selectedCount || approvers.length || 1)}
                  value={cappedRequired}
                  onChange={(e) => {
                    const v = parseInt(e.target.value, 10);
                    setRequired(Number.isFinite(v) && v > 0 ? v : 1);
                  }}
                  required
                />
              </div>
            )}

            <div className="space-y-2">
              <div className="flex items-baseline justify-between">
                <Label>Aprobadores</Label>
                {hasApprovers ? (
                  <span className="text-xs text-muted-foreground">
                    {selectedCount} seleccionado{selectedCount === 1 ? "" : "s"}
                  </span>
                ) : null}
              </div>
              {hasApprovers ? (
                <div className="grid gap-2 max-h-56 overflow-y-auto pr-1">
                  {approvers.map((a) => {
                    const checked = selected.includes(a.id);
                    const assignment = assignmentByApproverId.get(a.id);
                    const isLocked = lockedIds.has(a.id);
                    return (
                      <label
                        key={a.id}
                        className={
                          isLocked
                            ? "flex items-start gap-2 rounded-md border bg-neutral-50 p-3 cursor-not-allowed"
                            : "flex items-start gap-2 rounded-md border p-3 cursor-pointer hover:bg-neutral-50"
                        }
                      >
                        <Checkbox
                          checked={checked}
                          disabled={isLocked}
                          onCheckedChange={(state) => toggle(a.id, state)}
                          className="mt-0.5"
                        />
                        <div className="flex-1 leading-tight">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{a.name}</span>
                            {isLocked ? (
                              <Lock
                                className="size-3 text-muted-foreground"
                                aria-hidden
                              />
                            ) : null}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {a.email}
                          </div>
                        </div>
                        {assignment && assignment.status ? (
                          <StatusBadge status={assignment.status} />
                        ) : null}
                      </label>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
                  No hay aprobadores activos.{" "}
                  <Link
                    href="/aprobadores/new"
                    className="font-medium text-foreground underline underline-offset-2"
                  >
                    Crea uno
                  </Link>{" "}
                  para continuar.
                </div>
              )}
              {lockedIds.size > 0 ? (
                <p className="text-xs text-muted-foreground">
                  Los aprobadores con candado ya emitieron su decisión y no se
                  pueden quitar.
                </p>
              ) : null}
            </div>

            {/* Orden de la cadena (solo en modo cascada) */}
            {isSequential && selectedCount > 1 ? (
              <div className="space-y-2">
                <Label>Orden de aprobación (cascada)</Label>
                <ol className="space-y-1.5">
                  {selected.map((id, index) => (
                    <li
                      key={id}
                      className="flex items-center gap-2 rounded-md border bg-white px-3 py-2"
                    >
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-xs font-semibold text-white">
                        {index + 1}
                      </span>
                      <span className="flex-1 truncate text-sm text-neutral-800">
                        {nameByApproverId.get(id) ?? "—"}
                      </span>
                      <div className="flex shrink-0 gap-1">
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="size-7"
                          disabled={index === 0}
                          onClick={() => move(id, -1)}
                          aria-label="Subir"
                        >
                          <ArrowUp className="size-4" />
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="size-7"
                          disabled={index === selectedCount - 1}
                          onClick={() => move(id, 1)}
                          aria-label="Bajar"
                        >
                          <ArrowDown className="size-4" />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            ) : null}

            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setOpen(false)}
              >
                Cancelar
              </Button>
              <SubmitButton disabled={!canSubmit} pendingLabel="Guardando…">
                {isEdit ? "Guardar cambios" : "Guardar configuración"}
              </SubmitButton>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
