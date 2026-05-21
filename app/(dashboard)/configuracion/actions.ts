"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth/current-user";

type Role = "admin" | "approver" | "purchasing";

function parseRole(v: FormDataEntryValue | null): Role {
  const s = String(v ?? "");
  if (s === "admin" || s === "approver" || s === "purchasing") return s;
  return "approver";
}

export async function createUserWithAuth(formData: FormData) {
  await requireAdmin();

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const role = parseRole(formData.get("role"));
  const is_active = formData.get("is_active") === "on";

  if (!name || !email || !password) {
    redirect(
      `/configuracion/new?error=${encodeURIComponent("Nombre, email y contraseña son requeridos")}`,
    );
  }
  if (password.length < 8) {
    redirect(
      `/configuracion/new?error=${encodeURIComponent("La contraseña debe tener al menos 8 caracteres")}`,
    );
  }

  const admin = createAdminClient();
  const { data: created, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (authError || !created.user) {
    redirect(
      `/configuracion/new?error=${encodeURIComponent(authError?.message ?? "No se pudo crear el usuario")}`,
    );
  }

  const supabase = await createClient();
  const { error: insertError } = await supabase.from("approvers").insert({
    name,
    email,
    role,
    is_active,
    auth_user_id: created.user.id,
  });

  if (insertError) {
    // Rollback del usuario auth si el insert falla.
    await admin.auth.admin.deleteUser(created.user.id);
    redirect(
      `/configuracion/new?error=${encodeURIComponent(insertError.message)}`,
    );
  }

  revalidatePath("/configuracion");
  revalidatePath("/aprobadores");
  redirect(
    `/configuracion?success=${encodeURIComponent(`Usuario ${email} creado`)}`,
  );
}

export async function updateUserConfig(formData: FormData) {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const role = parseRole(formData.get("role"));
  const is_active = formData.get("is_active") === "on";

  if (!id || !name) {
    redirect(`/configuracion?error=${encodeURIComponent("Datos inválidos")}`);
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("approvers")
    .update({ name, role, is_active })
    .eq("id", id);

  if (error) {
    redirect(
      `/configuracion/${id}?error=${encodeURIComponent(error.message)}`,
    );
  }

  revalidatePath("/configuracion");
  revalidatePath(`/configuracion/${id}`);
  revalidatePath("/aprobadores");
  redirect(
    `/configuracion?success=${encodeURIComponent("Usuario actualizado")}`,
  );
}

export async function createAccessAccount(formData: FormData) {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  const password = String(formData.get("password") ?? "");

  if (!id) {
    redirect(`/configuracion?error=${encodeURIComponent("Datos inválidos")}`);
  }
  if (password.length < 8) {
    redirect(
      `/configuracion/${id}?error=${encodeURIComponent("La contraseña debe tener al menos 8 caracteres")}`,
    );
  }

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("approvers")
    .select("email, auth_user_id")
    .eq("id", id)
    .maybeSingle();

  if (!profile) {
    redirect(`/configuracion?error=${encodeURIComponent("Usuario no encontrado")}`);
  }
  if (profile.auth_user_id) {
    redirect(
      `/configuracion/${id}?error=${encodeURIComponent("Este usuario ya tiene cuenta de acceso")}`,
    );
  }

  const admin = createAdminClient();
  const { data: created, error: authError } = await admin.auth.admin.createUser({
    email: profile.email,
    password,
    email_confirm: true,
  });
  if (authError || !created.user) {
    redirect(
      `/configuracion/${id}?error=${encodeURIComponent(authError?.message ?? "No se pudo crear la cuenta")}`,
    );
  }

  const { error: linkError } = await supabase
    .from("approvers")
    .update({ auth_user_id: created.user.id })
    .eq("id", id);

  if (linkError) {
    await admin.auth.admin.deleteUser(created.user.id);
    redirect(`/configuracion/${id}?error=${encodeURIComponent(linkError.message)}`);
  }

  revalidatePath("/configuracion");
  revalidatePath(`/configuracion/${id}`);
  redirect(
    `/configuracion?success=${encodeURIComponent(`Cuenta creada para ${profile.email}`)}`,
  );
}

export async function resetUserPassword(formData: FormData) {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  const password = String(formData.get("password") ?? "");

  if (!id || password.length < 8) {
    redirect(
      `/configuracion/${id}?error=${encodeURIComponent("Contraseña inválida (mín 8 caracteres)")}`,
    );
  }

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("approvers")
    .select("auth_user_id, email")
    .eq("id", id)
    .maybeSingle();

  if (!profile?.auth_user_id) {
    redirect(
      `/configuracion/${id}?error=${encodeURIComponent("Este usuario no tiene cuenta de acceso")}`,
    );
  }

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(profile.auth_user_id!, {
    password,
  });
  if (error) {
    redirect(`/configuracion/${id}?error=${encodeURIComponent(error.message)}`);
  }

  redirect(
    `/configuracion?success=${encodeURIComponent(`Contraseña actualizada para ${profile.email}`)}`,
  );
}

export async function deleteUser(formData: FormData) {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();

  const [{ count: approvalsCount }, { count: rulesCount }, { data: profile }] =
    await Promise.all([
      supabase
        .from("approvals")
        .select("id", { count: "exact", head: true })
        .eq("approver_id", id),
      supabase
        .from("approval_rules")
        .select("id", { count: "exact", head: true })
        .eq("approver_id", id),
      supabase.from("approvers").select("auth_user_id").eq("id", id).maybeSingle(),
    ]);

  if ((approvalsCount ?? 0) > 0 || (rulesCount ?? 0) > 0) {
    redirect(
      `/configuracion?error=${encodeURIComponent("No se puede eliminar: el usuario tiene aprobaciones o reglas asociadas. Desactívalo en su lugar.")}`,
    );
  }

  const { error } = await supabase.from("approvers").delete().eq("id", id);
  if (error) {
    redirect(`/configuracion?error=${encodeURIComponent(error.message)}`);
  }

  if (profile?.auth_user_id) {
    const admin = createAdminClient();
    await admin.auth.admin.deleteUser(profile.auth_user_id);
  }

  revalidatePath("/configuracion");
  revalidatePath("/aprobadores");
  redirect(`/configuracion?success=${encodeURIComponent("Usuario eliminado")}`);
}
