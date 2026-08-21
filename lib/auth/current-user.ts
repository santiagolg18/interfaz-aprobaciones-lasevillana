import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/database.types";

export type AppRole = "admin" | "approver" | "purchasing";
export type CurrentUserRole = AppRole | "unknown";

type ApproverRow = Database["public"]["Tables"]["approvers"]["Row"];

export type CurrentUser = {
  user: User;
  profile: ApproverRow | null;
  role: CurrentUserRole;
};

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  let { data: profile } = await supabase
    .from("approvers")
    .select("*")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!profile && user.email) {
    const { data: byEmail } = await supabase
      .from("approvers")
      .select("*")
      .eq("email", user.email)
      .maybeSingle();
    profile = byEmail ?? null;
  }

  const role: CurrentUserRole = profile
    ? profile.is_active === false
      ? "unknown"
      : (profile.role as AppRole)
    : "unknown";

  return { user, profile, role };
}

// Elegibilidad para aprobar facturas: activo y, o bien es Aprobador, o bien tiene
// la casilla "Puede aprobar facturas" (can_approve) habilitada (Compras/Admin).
export function canApproveInvoices(
  profile: Pick<ApproverRow, "role" | "is_active" | "can_approve"> | null,
): boolean {
  if (!profile || profile.is_active === false) return false;
  return profile.role === "approver" || profile.can_approve === true;
}

export async function requireAdmin(): Promise<CurrentUser> {
  const me = await getCurrentUser();
  if (!me) redirect("/login");
  if (me.role !== "admin") redirect("/facturas");
  return me;
}

export async function requireStaff(): Promise<CurrentUser> {
  const me = await getCurrentUser();
  if (!me) redirect("/login");
  if (me.role === "approver") redirect("/mis-aprobaciones");
  if (me.role !== "admin" && me.role !== "purchasing") redirect("/login");
  return me;
}

export function defaultHomeForRole(role: CurrentUserRole): string {
  if (role === "approver") return "/mis-aprobaciones";
  // Admin gestiona ambos frentes (parrilla/agropecuaria); aterriza en el Dashboard
  // neutral, no en /facturas "todos" (que ya no se usa). Compras sí va a /facturas:
  // el servidor fuerza su frente asignado, así que solo ve el suyo.
  if (role === "admin") return "/dashboard";
  if (role === "purchasing") return "/facturas";
  return "/login";
}

/**
 * Guarda para server actions que solo puede ejecutar el personal interno
 * (Admin o Compras). Devuelve el id de perfil del actor para auditoría.
 *
 * A diferencia de requireStaff(), NO redirige: devuelve un resultado que la
 * action puede convertir en un mensaje de error inline.
 */
export async function requireStaffProfile(): Promise<
  { ok: true; approverId: string } | { ok: false; error: string }
> {
  const me = await getCurrentUser();
  if (!me || !me.profile) return { ok: false, error: "Sesión expirada" };
  if (me.role !== "admin" && me.role !== "purchasing") {
    return { ok: false, error: "No tienes permiso para esta acción" };
  }
  return { ok: true, approverId: me.profile.id };
}
