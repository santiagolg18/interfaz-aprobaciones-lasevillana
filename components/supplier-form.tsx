"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertCircle, ListOrdered, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/submit-button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type Approver = { id: string; name: string; email: string };

export function SupplierForm({
  action,
  supplier,
  approvers,
  assignedApproverIds,
  assignedOrder,
  error,
  from,
}: {
  action: (formData: FormData) => void | Promise<void>;
  supplier?: {
    id: string;
    nit: string;
    nombre: string;
    direccion: string | null;
    telefono: string | null;
    celular: string | null;
    email: string | null;
    tipo: string | null;
    contacto_facturacion: string | null;
    mail_contacto_facturacion: string | null;
    required_approvals: number;
    approval_mode?: string | null;
  };
  approvers: Approver[];
  assignedApproverIds: string[];
  // Orden en la cadena (approval_order) de los aprobadores ya asignados.
  assignedOrder?: Record<string, number>;
  error?: string;
  // URL de la lista de origen: se devuelve al usuario ahí al guardar/cancelar.
  from?: string | null;
}) {
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(assignedApproverIds),
  );
  const [required, setRequired] = useState<number>(
    Math.max(1, supplier?.required_approvals ?? 1),
  );
  const [mode, setMode] = useState<"parallel" | "sequential">(
    supplier?.approval_mode === "sequential" ? "sequential" : "parallel",
  );

  const selectedCount = selected.size;
  // El umbral no puede exceder los aprobadores marcados (si no, las facturas
  // de este proveedor jamás alcanzarían las aprobaciones requeridas).
  const cappedRequired =
    selectedCount > 0 ? Math.min(required, selectedCount) : required;

  function toggleApprover(id: string, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  return (
    <form action={action} className="space-y-6">
      {supplier ? <input type="hidden" name="id" value={supplier.id} /> : null}
      {from ? <input type="hidden" name="from" value={from} /> : null}

      <div className="space-y-4">
        <h2 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
          Datos básicos
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="nit">NIT</Label>
            <Input
              id="nit"
              name="nit"
              required
              defaultValue={supplier?.nit ?? ""}
              placeholder="900123456"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="nombre">Nombre</Label>
            <Input
              id="nombre"
              name="nombre"
              required
              defaultValue={supplier?.nombre ?? ""}
              placeholder="Proveedor SAS"
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="direccion">Dirección</Label>
            <Input
              id="direccion"
              name="direccion"
              defaultValue={supplier?.direccion ?? ""}
              placeholder="CR 1 47 06"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="telefono">Teléfono</Label>
            <Input
              id="telefono"
              name="telefono"
              defaultValue={supplier?.telefono ?? ""}
              placeholder="3253211"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="celular">Celular</Label>
            <Input
              id="celular"
              name="celular"
              defaultValue={supplier?.celular ?? ""}
              placeholder="3114621511"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              name="email"
              type="email"
              defaultValue={supplier?.email ?? ""}
              placeholder="proveedor@empresa.com"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tipo">Tipo</Label>
            <Select name="tipo" defaultValue={supplier?.tipo ?? ""}>
              <SelectTrigger id="tipo">
                <SelectValue placeholder="Selecciona tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="O">O — Ocasional</SelectItem>
                <SelectItem value="P">P — Permanente</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
          Contacto de facturación
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="contacto_facturacion">Contacto</Label>
            <Input
              id="contacto_facturacion"
              name="contacto_facturacion"
              defaultValue={supplier?.contacto_facturacion ?? ""}
              placeholder="Nombre del contacto"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="mail_contacto_facturacion">Mail del contacto</Label>
            <Input
              id="mail_contacto_facturacion"
              name="mail_contacto_facturacion"
              type="email"
              defaultValue={supplier?.mail_contacto_facturacion ?? ""}
              placeholder="contacto@empresa.com"
            />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
          Aprobaciones
        </h2>

        <div className="space-y-2">
          <Label>Modo de aprobación</Label>
          <input type="hidden" name="approval_mode" value={mode} />
          <div className="grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setMode("parallel")}
              aria-pressed={mode === "parallel"}
              className={cn(
                "flex items-start gap-2.5 rounded-md border p-3 text-left transition-colors",
                mode === "parallel"
                  ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                  : "hover:bg-neutral-50",
              )}
            >
              <Users className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <span className="leading-tight">
                <span className="block text-sm font-medium">Independiente</span>
                <span className="block text-xs text-muted-foreground">
                  Todos reciben la factura a la vez; aprueban en cualquier orden.
                </span>
              </span>
            </button>
            <button
              type="button"
              onClick={() => setMode("sequential")}
              aria-pressed={mode === "sequential"}
              className={cn(
                "flex items-start gap-2.5 rounded-md border p-3 text-left transition-colors",
                mode === "sequential"
                  ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                  : "hover:bg-neutral-50",
              )}
            >
              <ListOrdered className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <span className="leading-tight">
                <span className="block text-sm font-medium">En cascada</span>
                <span className="block text-xs text-muted-foreground">
                  Uno tras otro, siguiendo el orden de la cadena.
                </span>
              </span>
            </button>
          </div>
        </div>

        <div className="space-y-1.5 sm:max-w-[220px]">
          <Label htmlFor="required_approvals">Aprobaciones requeridas</Label>
          <Input
            id="required_approvals"
            name="required_approvals"
            type="number"
            min={1}
            max={Math.max(1, selectedCount || 1)}
            required
            value={cappedRequired}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10);
              setRequired(Number.isFinite(v) && v > 0 ? v : 1);
            }}
          />
          {selectedCount > 0 ? (
            <p className="text-xs text-muted-foreground">
              Máximo {selectedCount}: no puede exceder los aprobadores
              seleccionados.
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label>Aprobadores asignados</Label>
          <p className="text-xs text-muted-foreground">
            Selecciona quiénes deben firmar las facturas de este proveedor. Solo
            se listan usuarios con permiso de aprobar. Los nuevos se agregan al
            final de la cadena.
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {approvers.length === 0 ? (
              <p className="text-sm text-muted-foreground italic col-span-2">
                No hay usuarios con permiso de aprobar. Crea uno en
                Configuración.
              </p>
            ) : (
              approvers.map((a) => {
                const order = assignedOrder?.[a.id];
                return (
                  <label
                    key={a.id}
                    className="flex items-start gap-2 rounded-md border p-3 cursor-pointer hover:bg-neutral-50"
                  >
                    <Checkbox
                      name="approver_ids"
                      value={a.id}
                      checked={selected.has(a.id)}
                      onCheckedChange={(state) =>
                        toggleApprover(a.id, state === true)
                      }
                      className="mt-0.5"
                    />
                    <div className="flex-1 leading-tight">
                      <div className="flex items-center gap-1.5 text-sm font-medium">
                        {a.name}
                        {mode === "sequential" && order && selected.has(a.id) ? (
                          <span className="inline-flex size-5 items-center justify-center rounded-full bg-neutral-100 text-[11px] font-semibold tabular-nums text-neutral-600">
                            {order}
                          </span>
                        ) : null}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {a.email}
                      </div>
                    </div>
                  </label>
                );
              })
            )}
          </div>
        </div>
      </div>

      {error ? (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700 ring-1 ring-inset ring-rose-200"
        >
          <AlertCircle className="size-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      <div className="flex items-center gap-2 justify-end">
        <Button asChild variant="ghost">
          <Link href={from ?? "/proveedores"}>Cancelar</Link>
        </Button>
        <SubmitButton pendingLabel={supplier ? "Guardando…" : "Creando…"}>
          {supplier ? "Guardar cambios" : "Crear proveedor"}
        </SubmitButton>
      </div>
    </form>
  );
}
