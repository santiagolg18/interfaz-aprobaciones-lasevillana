"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/current-user";
import { redirectWithError, redirectWithSuccess } from "@/lib/redirects";

// La creación de aprobadores vive en /configuracion/new (crea también la
// cuenta de acceso). Aquí solo queda editar nombre/estado y activar/desactivar.

export async function updateApprover(formData: FormData) {
  await requireAdmin();

  const id = (formData.get("id") as string) || undefined;
  const name = String(formData.get("name") ?? "").trim();
  const is_active = formData.get("is_active") === "on";

  if (!id || !name) {
    redirectWithError("/aprobadores", "Datos inválidos");
  }

  const supabase = await createClient();
  // El email NO se actualiza: es el vínculo con la cuenta de acceso (login) y
  // cambiarlo dejaría al usuario sin poder entrar. Igual que en Configuración.
  const { error } = await supabase
    .from("approvers")
    .update({ name, is_active })
    .eq("id", id);

  if (error) {
    redirectWithError(`/aprobadores/${id}`, error.message);
  }

  revalidatePath("/aprobadores");
  revalidatePath(`/aprobadores/${id}`);
  revalidatePath("/configuracion");
  redirectWithSuccess("/aprobadores", `Aprobador ${name} actualizado`);
}

export async function toggleApproverActive(formData: FormData) {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  const nextActive = formData.get("next_active") === "true";
  if (!id) return;

  const supabase = await createClient();
  const { error } = await supabase
    .from("approvers")
    .update({ is_active: nextActive })
    .eq("id", id);

  if (error) {
    redirectWithError("/aprobadores", error.message);
  }

  revalidatePath("/aprobadores");
  revalidatePath("/configuracion");
  redirectWithSuccess(
    "/aprobadores",
    nextActive ? "Aprobador activado" : "Aprobador desactivado",
  );
}
