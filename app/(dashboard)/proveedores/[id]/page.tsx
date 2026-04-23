import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SupplierForm } from "@/components/supplier-form";
import { createClient } from "@/lib/supabase/server";
import { updateSupplier } from "../actions";

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;
type SearchParams = Promise<{ error?: string }>;

export default async function EditarProveedorPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const supabase = await createClient();

  const [
    { data: supplier },
    { data: approvers },
    { data: rules },
  ] = await Promise.all([
    supabase.from("suppliers").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("approvers")
      .select("id, name, email, is_active")
      .order("name"),
    supabase.from("approval_rules").select("approver_id").eq("supplier_id", id),
  ]);

  if (!supplier) notFound();

  const assignedIds = (rules ?? []).map((r) => r.approver_id);
  // Incluir aprobadores inactivos si ya están asignados a este proveedor.
  const visibleApprovers = (approvers ?? []).filter(
    (a) => a.is_active || assignedIds.includes(a.id),
  );

  return (
    <div className="max-w-3xl space-y-5">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-2 mb-1 text-muted-foreground">
          <Link href="/proveedores">
            <ArrowLeft className="size-4" />
            Volver
          </Link>
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight">
          Editar proveedor
        </h1>
        <p className="text-sm text-muted-foreground">{supplier.name}</p>
      </div>
      <div className="rounded-lg border bg-white p-6">
        <SupplierForm
          action={updateSupplier}
          supplier={{
            id: supplier.id,
            nit: supplier.nit,
            name: supplier.name,
            required_approvals: supplier.required_approvals,
          }}
          approvers={visibleApprovers}
          assignedApproverIds={assignedIds}
          error={error ? decodeURIComponent(error) : undefined}
        />
      </div>
    </div>
  );
}
