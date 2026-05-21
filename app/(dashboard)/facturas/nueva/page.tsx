import { redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { NewInvoiceForm } from "@/components/new-invoice-form";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { createManualInvoice } from "../actions";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  error?: string;
  existing_id?: string;
  supplier_nit?: string;
  supplier_name?: string;
  invoice_number?: string;
  total_amount?: string;
  currency?: string;
  issue_date?: string;
  due_date?: string;
  description?: string;
  required_approvals?: string;
  approver_ids?: string | string[];
}>;

export default async function NuevaFacturaPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const me = await getCurrentUser();
  if (!me) redirect("/login");
  if (me.role !== "admin" && me.role !== "purchasing") {
    redirect(
      `/facturas?error=${encodeURIComponent("No tienes permiso para crear facturas")}`,
    );
  }

  const sp = await searchParams;
  const supabase = await createClient();

  const [approversResult, suppliersResult, rulesResult] = await Promise.all([
    supabase
      .from("approvers")
      .select("id, name, email")
      .eq("is_active", true)
      .order("name"),
    supabase
      .from("suppliers")
      .select("id, nit, nombre, required_approvals")
      .order("nombre"),
    supabase.from("approval_rules").select("supplier_id, approver_id"),
  ]);

  const approvers = approversResult.data ?? [];
  const suppliersRaw = suppliersResult.data ?? [];
  const rules = rulesResult.data ?? [];

  const rulesBySupplier = new Map<string, string[]>();
  for (const r of rules) {
    if (!r.supplier_id || !r.approver_id) continue;
    const list = rulesBySupplier.get(r.supplier_id) ?? [];
    list.push(r.approver_id);
    rulesBySupplier.set(r.supplier_id, list);
  }

  const suppliers = suppliersRaw.map((s) => ({
    id: s.id,
    nit: s.nit,
    nombre: s.nombre,
    required_approvals: s.required_approvals ?? 1,
    approver_ids: rulesBySupplier.get(s.id) ?? [],
  }));

  const approverIdsFromQuery = Array.isArray(sp.approver_ids)
    ? sp.approver_ids
    : sp.approver_ids
      ? [sp.approver_ids]
      : undefined;

  return (
    <div className="space-y-5">
      <PageHeader
        backHref="/facturas"
        backLabel="Volver a facturas"
        title="Nueva factura"
        description="Carga manual de facturas recibidas solo como PDF o imagen."
      />

      <NewInvoiceForm
        action={createManualInvoice}
        approvers={approvers}
        suppliers={suppliers}
        errorMessage={sp.error}
        existingInvoiceId={sp.existing_id}
        defaults={{
          supplier_nit: sp.supplier_nit,
          supplier_name: sp.supplier_name,
          invoice_number: sp.invoice_number,
          total_amount: sp.total_amount,
          currency: sp.currency,
          issue_date: sp.issue_date,
          due_date: sp.due_date,
          description: sp.description,
          required_approvals: sp.required_approvals,
          approver_ids: approverIdsFromQuery,
        }}
      />
    </div>
  );
}
