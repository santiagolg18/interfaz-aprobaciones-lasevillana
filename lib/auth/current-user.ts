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
  if (role === "admin" || role === "purchasing") return "/facturas";
  return "/login";
}
