"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Lock, Pencil, UserPlus } from "lucide-react";
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

  const lockedIds = useMemo(
    () =>
      new Set(
        currentAssignments
          .filter((a) => a.status && a.status !== "pending")
          .map((a) => a.approverId),
      ),
    [currentAssignments],
  );

  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(currentAssignments.map((a) => a.approverId)),
  );
  const [required, setRequired] = useState<number>(
    Math.max(1, currentRequired || 1),
  );

  const hasApprovers = approvers.length > 0;
  const selectedCount = selected.size;
  const canSubmit = selectedCount > 0;

  const cappedRequired = useMemo(
    () => (selectedCount > 0 ? Math.min(required, selectedCount) : required),
    [required, selectedCount],
  );

  function toggle(id: string, checked: boolean) {
    if (lockedIds.has(id)) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  const resolvedIcon =
    triggerIcon ?? (isEdit ? "pencil" : "user-plus");
  const resolvedLabel =
    triggerLabel ?? (isEdit ? "Editar" : "Configurar aprobadores");

  return (
    <>
      <Button
        size="sm"
        variant={triggerVariant}
        onClick={() => setOpen(true)}
      >
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
            <span className="font-medium text-foreground">{supplierName}</span>
            {" "}para sus próximas facturas.
          </DialogDescription>
        </DialogHeader>

        <form action={action} className="space-y-5">
          <input type="hidden" name="invoice_id" value={invoiceId} />
          <input type="hidden" name="required_approvals" value={cappedRequired} />

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
              <div className="grid gap-2 max-h-64 overflow-y-auto pr-1">
                {approvers.map((a) => {
                  const checked = selected.has(a.id);
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
                        name="approver_ids"
                        value={a.id}
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

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
            >
              Cancelar
            </Button>
            <SubmitButton
              disabled={!canSubmit}
              pendingLabel="Guardando…"
            >
              {isEdit ? "Guardar cambios" : "Guardar configuración"}
            </SubmitButton>
          </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
