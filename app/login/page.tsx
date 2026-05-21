import Image from "next/image";
import { AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/password-input";
import { SubmitButton } from "@/components/submit-button";
import { signIn } from "./actions";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ error?: string; next?: string }>;

export default async function LoginPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { error, next } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4 py-10">
      <div className="w-full max-w-sm rounded-xl border bg-white p-8 shadow-[0_4px_20px_-8px_rgb(0_0_0/0.08)]">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-4">
            <Image
              src="https://res.cloudinary.com/dqnsskjfg/image/upload/v1776400912/Logo-La-Sevillana_usd6wm.png"
              alt="Logo La Sevillana"
              width={160}
              height={80}
              className="object-contain"
              priority
            />
          </div>
          <h1 className="text-lg font-semibold text-neutral-900">
            Aprobaciones de Facturas
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Inicia sesión para continuar
          </p>
        </div>

        <form action={signIn} className="space-y-4">
          <input type="hidden" name="next" value={next ?? "/facturas"} />
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-sm font-medium">
              Email
            </Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="usuario@empresa.com"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-sm font-medium">
              Contraseña
            </Label>
            <PasswordInput
              id="password"
              required
              autoComplete="current-password"
            />
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

          <SubmitButton className="w-full" pendingLabel="Ingresando…">
            Ingresar
          </SubmitButton>
        </form>
      </div>
    </div>
  );
}
