import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SupplierForm } from "@/components/supplier-form";
import { createClient } from "@/lib/supabase/server";
import { requireStaff, canApproveInvoices } from "@/lib/auth/current-user";
import { updateSupplier } from "../actions";

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;
type SearchParams = Promise<{ error?: string; from?: string }>;

export default async function EditarProveedorPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  await requireStaff();
  const { id } = await params;
  const { error, from } = await searchParams;
  const backTo =
    from && from.startsWith("/proveedores") && !from.startsWith("//")
      ? from
      : "/proveedores";
  const supabase = await createClient();

  const [
    { data: supplier },
    { data: approvers },
    { data: rules },
  ] = await Promise.all([
    supabase.from("suppliers").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("approvers")
      .select("id, name, email, role, is_active, can_approve")
      .order("name"),
    supabase
      .from("approval_rules")
      .select("approver_id, approval_order")
      .eq("supplier_id", id)
      .order("approval_order", { ascending: true }),
  ]);

  if (!supplier) notFound();

  const assignedIds = (rules ?? []).map((r) => r.approver_id);
  const assignedOrder = Object.fromEntries(
    (rules ?? []).map((r) => [r.approver_id, r.approval_order ?? 1]),
  );
  // Solo usuarios elegibles para aprobar (Aprobador, o Admin/Compras con
  // can_approve); los ya asignados se conservan visibles para poder quitarlos.
  const visibleApprovers = (approvers ?? [])
    .filter((a) => canApproveInvoices(a) || assignedIds.includes(a.id))
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
        <h1 className="text-2xl font-semibold tracking-tight">
          Editar proveedor
        </h1>
        <p className="text-sm text-muted-foreground">{supplier.nombre}</p>
      </div>
      <div className="rounded-lg border bg-white p-6">
        <SupplierForm
          action={updateSupplier}
          supplier={{
            id: supplier.id,
            nit: supplier.nit,
            nombre: supplier.nombre,
            direccion: supplier.direccion,
            telefono: supplier.telefono,
            celular: supplier.celular,
            email: supplier.email,
            tipo: supplier.tipo,
            contacto_facturacion: supplier.contacto_facturacion,
            mail_contacto_facturacion: supplier.mail_contacto_facturacion,
            required_approvals: supplier.required_approvals,
            approval_mode: supplier.approval_mode,
          }}
          approvers={visibleApprovers}
          assignedApproverIds={assignedIds}
          assignedOrder={assignedOrder}
          error={error ? decodeURIComponent(error) : undefined}
          from={backTo}
        />
      </div>
    </div>
  );
}
