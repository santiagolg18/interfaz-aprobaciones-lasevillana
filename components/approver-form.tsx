import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";

export function ApproverForm({
  action,
  approver,
  error,
}: {
  action: (formData: FormData) => void | Promise<void>;
  approver?: { id: string; name: string; email: string; is_active: boolean };
  error?: string;
}) {
  const isEdit = !!approver;

  return (
    <form action={action} className="space-y-5">
      {approver ? <input type="hidden" name="id" value={approver.id} /> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="name">Nombre</Label>
          <Input
            id="name"
            name="name"
            required
            defaultValue={approver?.name ?? ""}
            placeholder="María Gómez"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            required
            defaultValue={approver?.email ?? ""}
            placeholder="maria@empresa.com"
          />
        </div>
      </div>

      <label className="flex items-center gap-3 rounded-md border p-3">
        <Switch
          id="is_active"
          name="is_active"
          defaultChecked={approver ? approver.is_active : true}
        />
        <div className="leading-tight">
          <div className="text-sm font-medium">Activo</div>
          <div className="text-xs text-muted-foreground">
            Los inactivos no aparecen al asignar reglas a proveedores.
          </div>
        </div>
      </label>

      {error ? (
        <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700 ring-1 ring-inset ring-rose-200">
          {error}
        </p>
      ) : null}

      <div className="flex items-center gap-2 justify-end">
        <Button asChild variant="ghost">
          <Link href="/aprobadores">Cancelar</Link>
        </Button>
        <Button type="submit">{isEdit ? "Guardar cambios" : "Crear aprobador"}</Button>
      </div>
    </form>
  );
}
