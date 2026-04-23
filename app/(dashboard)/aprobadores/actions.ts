"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function parseBasic(formData: FormData) {
  return {
    id: (formData.get("id") as string) || undefined,
    name: String(formData.get("name") ?? "").trim(),
    email: String(formData.get("email") ?? "").trim().toLowerCase(),
    is_active: formData.get("is_active") === "on",
  };
}

export async function createApprover(formData: FormData) {
  const input = parseBasic(formData);
  if (!input.name || !input.email) {
    redirect(
      `/aprobadores/new?error=${encodeURIComponent("Nombre y email son requeridos")}`,
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.from("approvers").insert({
    name: input.name,
    email: input.email,
    is_active: input.is_active,
  });

  if (error) {
    redirect(`/aprobadores/new?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/aprobadores");
  redirect("/aprobadores");
}

export async function updateApprover(formData: FormData) {
  const input = parseBasic(formData);
  if (!input.id || !input.name || !input.email) {
    redirect(`/aprobadores?error=${encodeURIComponent("Datos inválidos")}`);
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("approvers")
    .update({
      name: input.name,
      email: input.email,
      is_active: input.is_active,
    })
    .eq("id", input.id!);

  if (error) {
    redirect(
      `/aprobadores/${input.id}?error=${encodeURIComponent(error.message)}`,
    );
  }

  revalidatePath("/aprobadores");
  revalidatePath(`/aprobadores/${input.id}`);
  redirect("/aprobadores");
}

export async function toggleApproverActive(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const nextActive = formData.get("next_active") === "true";
  if (!id) return;

  const supabase = await createClient();
  const { error } = await supabase
    .from("approvers")
    .update({ is_active: nextActive })
    .eq("id", id);

  if (error) {
    redirect(`/aprobadores?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/aprobadores");
}
