import { redirect } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { getCurrentUser } from "@/lib/auth/current-user";
import { signOut } from "@/app/login/actions";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const me = await getCurrentUser();

  if (!me) {
    redirect("/login");
  }

  if (me.role === "unknown") {
    await signOut();
  }

  return (
    <div className="min-h-screen">
      <Sidebar userEmail={me.user.email ?? "—"} role={me.role} />
      <main className="lg:pl-64">
        <div className="px-4 py-6 sm:px-6 lg:px-8">{children}</div>
      </main>
    </div>
  );
}
