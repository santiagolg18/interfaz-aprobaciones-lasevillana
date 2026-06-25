import { createClient } from "@/lib/supabase/server";

export type DuplicateInvoice = {
  id: string;
  invoice_number: string;
  supplier_name: string;
  total_amount: number;
  status: string | null;
  received_at: string | null;
};

/**
 * Busca otras facturas (no archivadas) con el mismo proveedor (NIT) y el mismo
 * número de factura. Sirve para advertir de posibles duplicados — incluidas las
 * que llegan por correo, que no pasan por el bloqueo de la creación manual.
 *
 * Excluye la propia factura (excludeId) y las archivadas.
 */
export async function findDuplicateInvoices({
  supplierNit,
  invoiceNumber,
  excludeId,
}: {
  supplierNit: string | null | undefined;
  invoiceNumber: string | null | undefined;
  excludeId?: string;
}): Promise<DuplicateInvoice[]> {
  if (!supplierNit || !invoiceNumber) return [];

  const supabase = await createClient();
  let query = supabase
    .from("invoices")
    .select(
      "id, invoice_number, supplier_name, total_amount, status, received_at",
    )
    .eq("supplier_nit", supplierNit)
    .eq("invoice_number", invoiceNumber)
    .neq("status", "archived");
  if (excludeId) query = query.neq("id", excludeId);

  const { data } = await query.order("received_at", { ascending: false });
  return data ?? [];
}
