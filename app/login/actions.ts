"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser, defaultHomeForRole } from "@/lib/auth/current-user";

export async function signIn(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "").trim();

  if (!email || !password) {
    redirect(`/login?error=${encodeURIComponent("Email y contraseña son requeridos")}`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/", "layout");

  // Si venía de un deep link (p. ej. lo mandamos a /login con ?next=/proveedores),
  // lo respetamos. Si no, a la home según su rol: admin→/dashboard, compras→
  // /facturas (su frente), aprobador→/mis-aprobaciones.
  const isDeepLink =
    next.startsWith("/") && next !== "/login" && next !== "/facturas";
  if (isDeepLink) {
    redirect(next);
  }
  const me = await getCurrentUser();
  redirect(defaultHomeForRole(me?.role ?? "unknown"));
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
