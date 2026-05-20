import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Approver = { id: string; name: string; email: string };

export function SupplierForm({
  action,
  supplier,
  approvers,
  assignedApproverIds,
  error,
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
  };
  approvers: Approver[];
  assignedApproverIds: string[];
  error?: string;
}) {
  const assigned = new Set(assignedApproverIds);

  return (
    <form action={action} className="space-y-6">
      {supplier ? <input type="hidden" name="id" value={supplier.id} /> : null}

      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
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
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
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
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Aprobaciones
        </h2>
        <div className="space-y-1.5 sm:max-w-[200px]">
          <Label htmlFor="required_approvals">Aprobaciones requeridas</Label>
          <Input
            id="required_approvals"
            name="required_approvals"
            type="number"
            min={1}
            max={20}
            required
            defaultValue={supplier?.required_approvals ?? 1}
          />
        </div>

        <div className="space-y-2">
          <Label>Aprobadores asignados</Label>
          <p className="text-xs text-muted-foreground">
            Selecciona los aprobadores activos que deben firmar las facturas de este proveedor.
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {approvers.length === 0 ? (
              <p className="text-sm text-muted-foreground italic col-span-2">
                No hay aprobadores activos. Crea uno en la sección Aprobadores.
              </p>
            ) : (
              approvers.map((a) => (
                <label
                  key={a.id}
                  className="flex items-start gap-2 rounded-md border p-3 cursor-pointer hover:bg-neutral-50"
                >
                  <Checkbox
                    name="approver_ids"
                    value={a.id}
                    defaultChecked={assigned.has(a.id)}
                    className="mt-0.5"
                  />
                  <div className="leading-tight">
                    <div className="text-sm font-medium">{a.name}</div>
                    <div className="text-xs text-muted-foreground">{a.email}</div>
                  </div>
                </label>
              ))
            )}
          </div>
        </div>
      </div>

      {error ? (
        <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700 ring-1 ring-inset ring-rose-200">
          {error}
        </p>
      ) : null}

      <div className="flex items-center gap-2 justify-end">
        <Button asChild variant="ghost">
          <Link href="/proveedores">Cancelar</Link>
        </Button>
        <Button type="submit">{supplier ? "Guardar cambios" : "Crear proveedor"}</Button>
      </div>
    </form>
  );
}
