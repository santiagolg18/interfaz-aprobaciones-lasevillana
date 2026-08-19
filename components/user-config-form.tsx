"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/submit-button";
import { PasswordInput } from "@/components/password-input";
import { FormSelect } from "@/components/form-select";

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  is_active: boolean;
  business_front: string | null;
  can_approve: boolean;
};

export function UserConfigForm({
  action,
  user,
  error,
}: {
  action: (formData: FormData) => void | Promise<void>;
  user?: UserRow;
  error?: string;
}) {
  const isEdit = !!user;
  const [role, setRole] = useState<string>(user?.role ?? "approver");

  return (
    <form action={action} className="space-y-5">
      {user ? <input type="hidden" name="id" value={user.id} /> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="name">Nombre</Label>
          <Input
            id="name"
            name="name"
            required
            defaultValue={user?.name ?? ""}
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
            disabled={isEdit}
            defaultValue={user?.email ?? ""}
            placeholder="maria@empresa.com"
          />
          {isEdit ? (
            <p className="text-xs text-muted-foreground">
              El email no se puede cambiar después de crear la cuenta.
            </p>
          ) : null}
        </div>
      </div>

      {!isEdit ? (
        <div className="space-y-1.5">
          <Label htmlFor="password">Contraseña</Label>
          <PasswordInput
            id="password"
            name="password"
            required
            autoComplete="new-password"
            placeholder="Mínimo 8 caracteres"
          />
          <p className="text-xs text-muted-foreground">
            Comparte esta contraseña con el usuario de forma segura.
          </p>
        </div>
      ) : null}

      <div className="space-y-2">
        <Label>Rol</Label>
        <div className="grid gap-2 sm:grid-cols-3">
          {(["admin", "approver", "purchasing"] as const).map((r) => (
            <label
              key={r}
              className="flex cursor-pointer items-start gap-2.5 rounded-md border p-3 has-[:checked]:border-primary has-[:checked]:bg-primary/5"
            >
              <input
                type="radio"
                name="role"
                value={r}
                required
                checked={role === r}
                onChange={() => setRole(r)}
                className="mt-1"
              />
              <div className="leading-tight">
                <div className="text-sm font-medium capitalize">{roleLabel(r)}</div>
                <div className="text-xs text-muted-foreground">{roleHint(r)}</div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {role === "purchasing" ? (
        <div className="space-y-1.5">
          <Label htmlFor="business_front">Frente de negocio</Label>
          <FormSelect
            id="business_front"
            name="business_front"
            required
            defaultValue={user?.business_front ?? ""}
          >
            <option value="" disabled>
              Selecciona…
            </option>
            <option value="parrilla">Parrilla</option>
            <option value="agropecuaria">Agropecuaria</option>
            <option value="ambos">Ambos (Parrilla y Agropecuaria)</option>
          </FormSelect>
          <p className="text-xs text-muted-foreground">
            Este usuario de Compras verá únicamente las facturas de este frente.
            Con &quot;Ambos&quot; verá las facturas de los dos frentes.
          </p>
        </div>
      ) : null}

      {role === "admin" || role === "purchasing" ? (
        <label className="flex items-center gap-3 rounded-md border p-3">
          <Switch
            id="can_approve"
            name="can_approve"
            defaultChecked={user?.can_approve ?? false}
          />
          <div className="leading-tight">
            <div className="text-sm font-medium">Puede aprobar facturas</div>
            <div className="text-xs text-muted-foreground">
              Permite que este usuario apruebe las facturas que se le asignen,
              además de su rol.
            </div>
          </div>
        </label>
      ) : null}

      <label className="flex items-center gap-3 rounded-md border p-3">
        <Switch
          id="is_active"
          name="is_active"
          defaultChecked={user ? user.is_active : true}
        />
        <div className="leading-tight">
          <div className="text-sm font-medium">Activo</div>
          <div className="text-xs text-muted-foreground">
            Si está inactivo, el usuario no podrá iniciar sesión.
          </div>
        </div>
      </label>

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
          <Link href="/configuracion">Cancelar</Link>
        </Button>
        <SubmitButton pendingLabel={isEdit ? "Guardando…" : "Creando…"}>
          {isEdit ? "Guardar cambios" : "Crear usuario"}
        </SubmitButton>
      </div>
    </form>
  );
}

function roleLabel(r: "admin" | "approver" | "purchasing") {
  if (r === "admin") return "Admin";
  if (r === "approver") return "Aprobador";
  return "Compras";
}

function roleHint(r: "admin" | "approver" | "purchasing") {
  if (r === "admin") return "Acceso total + gestión de usuarios.";
  if (r === "approver") return "Solo ve sus facturas pendientes para aprobar.";
  return "Ve todas las facturas, sube OC; no aprueba.";
}
