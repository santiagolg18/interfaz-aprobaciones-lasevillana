import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SupplierForm } from "@/components/supplier-form";
import { createClient } from "@/lib/supabase/server";
import { requireStaff, canApproveInvoices } from "@/lib/auth/current-user";
import { createSupplier } from "../actions";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ error?: string; from?: string }>;

export default async function NuevoProveedorPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireStaff();
  const { error, from } = await searchParams;
  const backTo =
    from && from.startsWith("/proveedores") && !from.startsWith("//")
      ? from
      : "/proveedores";
  const supabase = await createClient();
  const { data: approvers } = await supabase
    .from("approvers")
    .select("id, name, email, role, is_active, can_approve")
    .eq("is_active", true)
    .order("name");

  // Solo usuarios elegibles para aprobar (Aprobador, o Admin/Compras con can_approve).
  const eligibleApprovers = (approvers ?? [])
    .filter((a) => canApproveInvoices(a))
    .map(({ id, name, email }) => ({ id, name, email }));

  return (
    <div className="max-w-3xl space-y-5">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-2 mb-1 text-muted-foreground">
          <Link href={backTo}>
            <ArrowLeft className="size-4" />
            Volver
          </Link>
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight">Nuevo proveedor</h1>
      </div>
      <div className="rounded-lg border bg-white p-6">
        <SupplierForm
          action={createSupplier}
          approvers={eligibleApprovers}
          assignedApproverIds={[]}
          error={error ? decodeURIComponent(error) : undefined}
          from={backTo}
        />
      </div>
    </div>
  );
}
