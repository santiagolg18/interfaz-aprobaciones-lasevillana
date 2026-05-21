"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AlertCircle, FileUp, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { SubmitButton } from "@/components/submit-button";

type Approver = { id: string; name: string; email: string };
type SupplierOption = {
  id: string;
  nit: string;
  nombre: string;
  required_approvals: number;
  approver_ids: string[];
};

type Defaults = {
  supplier_nit?: string;
  supplier_name?: string;
  invoice_number?: string;
  total_amount?: string;
  currency?: string;
  issue_date?: string;
  due_date?: string;
  description?: string;
  required_approvals?: string;
  approver_ids?: string[];
};

export function NewInvoiceForm({
  action,
  approvers,
  suppliers,
  defaults,
  errorMessage,
  existingInvoiceId,
}: {
  action: (formData: FormData) => void | Promise<void>;
  approvers: Approver[];
  suppliers: SupplierOption[];
  defaults?: Defaults;
  errorMessage?: string;
  existingInvoiceId?: string;
}) {
  const [nit, setNit] = useState<string>(defaults?.supplier_nit ?? "");
  const [supplierName, setSupplierName] = useState<string>(
    defaults?.supplier_name ?? "",
  );
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(defaults?.approver_ids ?? []),
  );
  const [required, setRequired] = useState<number>(() => {
    const parsed = parseInt(defaults?.required_approvals ?? "1", 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
  });
  const [fileName, setFileName] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const suppliersByNit = useMemo(
    () => new Map(suppliers.map((s) => [s.nit, s])),
    [suppliers],
  );

  const matchedSupplier = nit ? suppliersByNit.get(nit.trim()) ?? null : null;

  function applySupplierDefaults(s: SupplierOption) {
    setSupplierName(s.nombre);
    const ids = s.approver_ids.filter((id) => approvers.some((a) => a.id === id));
    setSelected(new Set(ids));
    setRequired(Math.max(1, s.required_approvals || 1));
  }

  function onNitChange(value: string) {
    setNit(value);
    const found = suppliersByNit.get(value.trim());
    if (found) applySupplierDefaults(found);
  }

  function onSupplierPicked(s: SupplierOption) {
    setNit(s.nit);
    applySupplierDefaults(s);
  }

  function toggleApprover(id: string, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setFileName(e.target.files?.[0]?.name ?? "");
  }

  const selectedCount = selected.size;
  const cappedRequired =
    selectedCount > 0 ? Math.min(required, selectedCount) : required;
  const canSubmit = selectedCount > 0;

  const filteredSuggestions = useMemo(() => {
    const term = nit.trim();
    if (!term || matchedSupplier) return [] as SupplierOption[];
    return suppliers
      .filter(
        (s) =>
          s.nit.includes(term) ||
          s.nombre.toLowerCase().includes(term.toLowerCase()),
      )
      .slice(0, 6);
  }, [nit, matchedSupplier, suppliers]);

  return (
    <form action={action} className="space-y-6">
      {errorMessage ? (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700 ring-1 ring-inset ring-rose-200"
        >
          <AlertCircle className="size-4 mt-0.5 shrink-0" />
          <div className="flex-1">
            <div>{errorMessage}</div>
            {existingInvoiceId ? (
              <Link
                href={`/facturas/${existingInvoiceId}`}
                className="mt-1 inline-block font-medium underline underline-offset-2"
              >
                Ver factura existente
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}

      <section className="rounded-lg border bg-white p-4 shadow-[0_1px_2px_0_rgb(0_0_0/0.03)] space-y-4">
        <h2 className="text-sm font-semibold text-neutral-900">Proveedor</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="supplier_nit">NIT</Label>
            <div className="relative">
              <Search className="size-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="supplier_nit"
                name="supplier_nit"
                required
                value={nit}
                onChange={(e) => onNitChange(e.target.value)}
                placeholder="900123456"
                autoComplete="off"
                className="pl-8"
              />
              {filteredSuggestions.length > 0 ? (
                <ul className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-md border bg-white shadow-md">
                  {filteredSuggestions.map((s) => (
                    <li key={s.id}>
                      <button
                        type="button"
                        onClick={() => onSupplierPicked(s)}
                        className="block w-full px-3 py-2 text-left text-sm hover:bg-neutral-50"
                      >
                        <div className="font-medium text-neutral-900 truncate">
                          {s.nombre}
                        </div>
                        <div className="text-xs text-muted-foreground tabular-nums">
                          NIT {s.nit}
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
            <p className="text-xs text-muted-foreground">
              {matchedSupplier
                ? "Proveedor encontrado: se cargaron sus aprobadores por defecto."
                : "Si no existe, se creará automáticamente con el nombre que indiques."}
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="supplier_name">Nombre</Label>
            <Input
              id="supplier_name"
              name="supplier_name"
              required
              value={supplierName}
              onChange={(e) => setSupplierName(e.target.value)}
              placeholder="Distribuidora ACME S.A.S."
            />
          </div>
        </div>
      </section>

      <section className="rounded-lg border bg-white p-4 shadow-[0_1px_2px_0_rgb(0_0_0/0.03)] space-y-4">
        <h2 className="text-sm font-semibold text-neutral-900">
          Datos de la factura
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="invoice_number">Número de factura</Label>
            <Input
              id="invoice_number"
              name="invoice_number"
              required
              defaultValue={defaults?.invoice_number ?? ""}
              placeholder="F44262051"
              autoComplete="off"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="total_amount">Monto total</Label>
            <Input
              id="total_amount"
              name="total_amount"
              type="number"
              step="0.01"
              min="0"
              required
              defaultValue={defaults?.total_amount ?? ""}
              placeholder="1500000"
              inputMode="decimal"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="currency">Moneda</Label>
            <Input
              id="currency"
              name="currency"
              defaultValue={defaults?.currency ?? "COP"}
              maxLength={3}
              placeholder="COP"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="issue_date">Fecha de emisión</Label>
            <Input
              id="issue_date"
              name="issue_date"
              type="date"
              required
              defaultValue={defaults?.issue_date ?? ""}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="due_date">Vencimiento (opcional)</Label>
            <Input
              id="due_date"
              name="due_date"
              type="date"
              defaultValue={defaults?.due_date ?? ""}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="description">Descripción (opcional)</Label>
          <Textarea
            id="description"
            name="description"
            rows={3}
            defaultValue={defaults?.description ?? ""}
            placeholder="Observaciones, concepto, etc."
          />
        </div>
      </section>

      <section className="rounded-lg border bg-white p-4 shadow-[0_1px_2px_0_rgb(0_0_0/0.03)] space-y-3">
        <h2 className="text-sm font-semibold text-neutral-900">Archivo</h2>
        <p className="text-xs text-muted-foreground">
          Adjunta el PDF o imagen original de la factura (PDF, JPG o PNG, máx.
          10 MB).
        </p>
        <input
          ref={fileInputRef}
          id="file"
          name="file"
          type="file"
          accept="application/pdf,image/jpeg,image/png"
          required
          onChange={onFileChange}
          className="sr-only"
        />
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
          >
            <FileUp className="size-4" />
            Seleccionar archivo
          </Button>
          <span className="text-sm text-muted-foreground truncate">
            {fileName || "Ningún archivo seleccionado"}
          </span>
        </div>
      </section>

      <section className="rounded-lg border bg-white p-4 shadow-[0_1px_2px_0_rgb(0_0_0/0.03)] space-y-4">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-sm font-semibold text-neutral-900">Aprobadores</h2>
          <span className="text-xs text-muted-foreground">
            {selectedCount} seleccionado{selectedCount === 1 ? "" : "s"}
          </span>
        </div>

        <div className="space-y-1.5 sm:max-w-[200px]">
          <Label htmlFor="required_approvals">Aprobaciones requeridas</Label>
          <Input
            id="required_approvals"
            name="required_approvals"
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

        {approvers.length > 0 ? (
          <div className="grid gap-2 max-h-72 overflow-y-auto pr-1">
            {approvers.map((a) => {
              const checked = selected.has(a.id);
              return (
                <label
                  key={a.id}
                  className="flex items-start gap-2 rounded-md border p-3 cursor-pointer hover:bg-neutral-50"
                >
                  <Checkbox
                    name="approver_ids"
                    value={a.id}
                    checked={checked}
                    onCheckedChange={(state) =>
                      toggleApprover(a.id, state === true)
                    }
                    className="mt-0.5"
                  />
                  <div className="flex-1 leading-tight">
                    <div className="text-sm font-medium">{a.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {a.email}
                    </div>
                  </div>
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
      </section>

      <div className="flex items-center justify-end gap-2">
        <Button asChild variant="ghost">
          <Link href="/facturas">Cancelar</Link>
        </Button>
        <SubmitButton disabled={!canSubmit} pendingLabel="Creando…">
          Crear factura
        </SubmitButton>
      </div>
    </form>
  );
}
