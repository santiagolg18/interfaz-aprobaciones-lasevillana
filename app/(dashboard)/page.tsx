import { redirect } from "next/navigation";
import { getCurrentUser, defaultHomeForRole } from "@/lib/auth/current-user";

export default async function DashboardHome() {
  const me = await getCurrentUser();
  redirect(defaultHomeForRole(me?.role ?? "unknown"));
}
