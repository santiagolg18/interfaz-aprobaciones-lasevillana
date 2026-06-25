"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/auth/current-user";

const PATH = "/configuracion/checklist";

function back(error?: string, success?: string) {
  const params = new URLSearchParams();
  if (error) params.set("error", error);
  if (success) params.set("success", success);
  const qs = params.toString();
  redirect(qs ? `${PATH}?${qs}` : PATH);
}

export async function createChecklistItem(formData: FormData) {
  await requireStaff();

  const label = String(formData.get("label") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const isRequired = formData.get("is_required") === "on";

  if (!label) back("Escribe el texto del punto a verificar");

  const supabase = await createClient();

  // sort_order = (máximo actual) + 1, para agregarlo al final.
  const { data: last } = await supabase
    .from("review_checklist_items")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextOrder = (last?.sort_order ?? 0) + 1;

  const { error } = await supabase.from("review_checklist_items").insert({
    label,
    description,
    is_required: isRequired,
    is_active: true,
    sort_order: nextOrder,
  });
  if (error) back(error.message);

  revalidatePath(PATH);
  back(undefined, "Punto agregado");
}

export async function updateChecklistItem(formData: FormData) {
  await requireStaff();

  const id = String(formData.get("id") ?? "");
  const label = String(formData.get("label") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const isRequired = formData.get("is_required") === "on";

  if (!id || !label) back("Datos inválidos");

  const supabase = await createClient();
  const { error } = await supabase
    .from("review_checklist_items")
    .update({ label, description, is_required: isRequired })
    .eq("id", id);
  if (error) back(error.message);

  revalidatePath(PATH);
  back(undefined, "Punto actualizado");
}

export async function setChecklistItemActive(formData: FormData) {
  await requireStaff();

  const id = String(formData.get("id") ?? "");
  // 'to' trae el nuevo valor deseado ('true' = activar, 'false' = desactivar).
  const to = String(formData.get("to") ?? "") === "true";

  if (!id) back("Datos inválidos");

  const supabase = await createClient();
  const { error } = await supabase
    .from("review_checklist_items")
    .update({ is_active: to })
    .eq("id", id);
  if (error) back(error.message);

  revalidatePath(PATH);
  back(undefined, to ? "Punto activado" : "Punto desactivado");
}

export async function moveChecklistItem(formData: FormData) {
  await requireStaff();

  const id = String(formData.get("id") ?? "");
  const dir = String(formData.get("dir") ?? "");
  if (!id || (dir !== "up" && dir !== "down")) back("Datos inválidos");

  const supabase = await createClient();
  const { data: items } = await supabase
    .from("review_checklist_items")
    .select("id, sort_order")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  const rows = items ?? [];
  const i = rows.findIndex((r) => r.id === id);
  if (i < 0) back("Punto no encontrado");

  const j = dir === "up" ? i - 1 : i + 1;
  if (j < 0 || j >= rows.length) {
    // Ya está en el extremo; nada que hacer.
    revalidatePath(PATH);
    back();
  }

  // Intercambiar sort_order con el vecino.
  const a = rows[i];
  const b = rows[j];
  await Promise.all([
    supabase
      .from("review_checklist_items")
      .update({ sort_order: b.sort_order })
      .eq("id", a.id),
    supabase
      .from("review_checklist_items")
      .update({ sort_order: a.sort_order })
      .eq("id", b.id),
  ]);

  revalidatePath(PATH);
  back();
}

export async function deleteChecklistItem(formData: FormData) {
  await requireStaff();

  const id = String(formData.get("id") ?? "");
  if (!id) back("Datos inválidos");

  const supabase = await createClient();
  const { error } = await supabase
    .from("review_checklist_items")
    .delete()
    .eq("id", id);
  if (error) back(error.message);

  revalidatePath(PATH);
  back(undefined, "Punto eliminado");
}
