import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

// En cascada (modo 'sequential') debe haber EXACTAMENTE un aprobador con turno
// activo. Esta función normaliza los estados: entre las aprobaciones aún no
// decididas (excluye 'approved'/'rejected'), ordenadas por approval_order (con
// created_at como desempate), la primera queda 'pending' (su turno) y TODAS las
// demás 'blocked' (en espera). Es idempotente: solo escribe cuando hay cambios.
//
// Se usa al liberar (submitPurchaseReview) y al reconfigurar aprobadores
// (configureInvoiceApprovers) para garantizar que la factura solo le aparezca al
// aprobador en turno y no a los siguientes.
export async function normalizeCascade(
  supabase: SupabaseClient<Database>,
  invoiceId: string,
): Promise<void> {
  const { data: chain } = await supabase
    .from("approvals")
    .select("id, status, approval_order")
    .eq("invoice_id", invoiceId)
    .order("approval_order", { ascending: true })
    .order("created_at", { ascending: true });

  const pendingChain = (chain ?? []).filter(
    (row) => row.status !== "approved" && row.status !== "rejected",
  );

  for (const [i, row] of pendingChain.entries()) {
    const desired = i === 0 ? "pending" : "blocked";
    if (row.status !== desired) {
      await supabase
        .from("approvals")
        .update({ status: desired })
        .eq("id", row.id);
    }
  }
}
