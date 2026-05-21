import { notFound } from "next/navigation";
import { KeyRound, UserPlus } from "lucide-react";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/page-header";
import { SubmitButton } from "@/components/submit-button";
import { PasswordInput } from "@/components/password-input";
import { UserConfigForm } from "@/components/user-config-form";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/current-user";
import {
  updateUserConfig,
  resetUserPassword,
  createAccessAccount,
} from "../actions";

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;
type SearchParams = Promise<{ error?: string }>;

export default async function EditarUsuarioPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  await requireAdmin();
  const { id } = await params;
  const sp = await searchParams;
  const error = sp.error ? decodeURIComponent(sp.error) : undefined;

  const supabase = await createClient();
  const { data: user } = await supabase
    .from("approvers")
    .select("id, name, email, role, is_active, auth_user_id")
    .eq("id", id)
    .maybeSingle();

  if (!user) notFound();

  return (
    <div className="space-y-5 max-w-3xl">
      <PageHeader
        backHref="/configuracion"
        backLabel="Volver a Configuración"
        title={`Editar ${user.name}`}
        description={user.email}
      />

      <div className="rounded-lg border bg-white p-5 shadow-[0_1px_2px_0_rgb(0_0_0/0.03)]">
        <UserConfigForm
          action={updateUserConfig}
          user={{
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            is_active: user.is_active ?? true,
          }}
          error={error}
        />
      </div>

      {user.auth_user_id ? (
        <div
          id="reset-password"
          className="rounded-lg border bg-white p-5 shadow-[0_1px_2px_0_rgb(0_0_0/0.03)] scroll-mt-20"
        >
          <div className="flex items-start gap-3 mb-4">
            <div className="flex size-9 items-center justify-center rounded-md bg-amber-100 text-amber-700">
              <KeyRound className="size-4" />
            </div>
            <div className="leading-tight">
              <h2 className="text-sm font-semibold text-neutral-900">
                Resetear contraseña
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Asigna una nueva contraseña. Comunícasela al usuario de forma
                segura.
              </p>
            </div>
          </div>

          <form action={resetUserPassword} className="space-y-4">
            <input type="hidden" name="id" value={user.id} />
            <div className="space-y-1.5">
              <Label htmlFor="reset-password-input">Nueva contraseña</Label>
              <PasswordInput
                id="reset-password-input"
                name="password"
                required
                autoComplete="new-password"
                placeholder="Mínimo 8 caracteres"
              />
            </div>
            <div className="flex justify-end">
              <SubmitButton pendingLabel="Guardando…" variant="outline">
                Actualizar contraseña
              </SubmitButton>
            </div>
          </form>
        </div>
      ) : (
        <div
          id="create-account"
          className="rounded-lg border border-amber-200 bg-amber-50/50 p-5 shadow-[0_1px_2px_0_rgb(0_0_0/0.03)] scroll-mt-20"
        >
          <div className="flex items-start gap-3 mb-4">
            <div className="flex size-9 items-center justify-center rounded-md bg-amber-100 text-amber-700">
              <UserPlus className="size-4" />
            </div>
            <div className="leading-tight">
              <h2 className="text-sm font-semibold text-neutral-900">
                Crear cuenta de acceso
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Este usuario aún no puede iniciar sesión. Asígnale una
                contraseña y se creará la cuenta con el email{" "}
                <strong className="text-neutral-900">{user.email}</strong>.
              </p>
            </div>
          </div>

          <form action={createAccessAccount} className="space-y-4">
            <input type="hidden" name="id" value={user.id} />
            <div className="space-y-1.5">
              <Label htmlFor="create-password-input">Contraseña inicial</Label>
              <PasswordInput
                id="create-password-input"
                name="password"
                required
                autoComplete="new-password"
                placeholder="Mínimo 8 caracteres"
              />
              <p className="text-xs text-muted-foreground">
                Comparte esta contraseña con el usuario de forma segura.
              </p>
            </div>
            <div className="flex justify-end">
              <SubmitButton pendingLabel="Creando…">
                <UserPlus className="size-4" />
                Crear cuenta
              </SubmitButton>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
