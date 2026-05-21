import { PageHeader } from "@/components/page-header";
import { UserConfigForm } from "@/components/user-config-form";
import { requireAdmin } from "@/lib/auth/current-user";
import { createUserWithAuth } from "../actions";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ error?: string }>;

export default async function NuevoUsuarioPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireAdmin();
  const sp = await searchParams;
  const error = sp.error ? decodeURIComponent(sp.error) : undefined;

  return (
    <div className="space-y-5 max-w-3xl">
      <PageHeader
        backHref="/configuracion"
        backLabel="Volver a Configuración"
        title="Nuevo usuario"
        description="Crea una cuenta para que pueda iniciar sesión en la app."
      />

      <div className="rounded-lg border bg-white p-5 shadow-[0_1px_2px_0_rgb(0_0_0/0.03)]">
        <UserConfigForm action={createUserWithAuth} error={error} />
      </div>
    </div>
  );
}
