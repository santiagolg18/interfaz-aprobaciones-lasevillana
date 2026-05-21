import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

function dateRange(from?: string | null, to?: string | null) {
  return {
    fromIso: from ? `${from}T00:00:00Z` : null,
    toIso: to ? `${to}T23:59:59Z` : null,
  };
}

function applyDateFilter<T extends object>(
  query: T,
  fromIso: string | null,
  toIso: string | null,
  field = "received_at",
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q = query as any;
  if (fromIso) q = q.gte(field, fromIso);
  if (toIso) q = q.lte(field, toIso);
  return q;
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const reporte = searchParams.get("reporte") ?? "completo";
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const { fromIso, toIso } = dateRange(from, to);

  const supabase = await createClient();

  const wb = XLSX.utils.book_new();

  if (reporte === "aprobadas") {
    let q = supabase
      .from("invoices")
      .select(
        "invoice_number, supplier_name, supplier_nit, total_amount, issue_date, received_at, completed_at, current_approvals, required_approvals",
      )
      .eq("status", "approved")
      .order("completed_at", { ascending: false });
    q = applyDateFilter(q, fromIso, toIso);
    const { data } = await q;

    const rows = (data ?? []).map((r) => ({
      "Número Factura": r.invoice_number,
      Proveedor: r.supplier_name,
      NIT: r.supplier_nit,
      "Monto (COP)": Number(r.total_amount),
      "Fecha Emisión": formatDate(r.issue_date),
      "Fecha Recepción": formatDateTime(r.received_at),
      "Fecha Aprobación": formatDateTime(r.completed_at),
      "Aprobaciones Obtenidas": r.current_approvals,
      "Aprobaciones Requeridas": r.required_approvals,
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "Aprobadas");
  }

  else if (reporte === "pendientes") {
    let q = supabase
      .from("invoices")
      .select(
        "invoice_number, supplier_name, supplier_nit, total_amount, issue_date, received_at, current_approvals, required_approvals",
      )
      .eq("status", "pending")
      .order("received_at", { ascending: true });
    q = applyDateFilter(q, fromIso, toIso);
    const { data } = await q;

    const now = Date.now();
    const rows = (data ?? []).map((r) => {
      const dias = r.received_at
        ? Math.floor((now - new Date(r.received_at).getTime()) / 86400000)
        : "—";
      return {
        "Número Factura": r.invoice_number,
        Proveedor: r.supplier_name,
        NIT: r.supplier_nit,
        "Monto (COP)": Number(r.total_amount),
        "Fecha Emisión": formatDate(r.issue_date),
        "Fecha Recepción": formatDateTime(r.received_at),
        "Progreso Aprobaciones": `${r.current_approvals}/${r.required_approvals}`,
        "Días Pendiente": dias,
      };
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "Pendientes");
  }

  else if (reporte === "rechazadas") {
    let q = supabase
      .from("invoices")
      .select(
        "invoice_number, supplier_name, supplier_nit, total_amount, issue_date, received_at, completed_at",
      )
      .eq("status", "rejected")
      .order("completed_at", { ascending: false });
    q = applyDateFilter(q, fromIso, toIso);
    const { data: invoices } = await q;

    // Get rejection details from approvals
    const invoiceNumbers = (invoices ?? []).map((i) => i.invoice_number);
    const approvalDetails: Record<string, { approver: string; notes: string; date: string }> = {};

    if (invoiceNumbers.length > 0) {
      const { data: rejApprovals } = await supabase
        .from("approvals")
        .select("invoice_id, notes, approved_at, approvers(name), invoices(invoice_number)")
        .eq("status", "rejected");

      for (const a of rejApprovals ?? []) {
        const invNum = (a.invoices as { invoice_number: string } | null)?.invoice_number ?? "";
        approvalDetails[invNum] = {
          approver: (a.approvers as { name: string } | null)?.name ?? "—",
          notes: a.notes ?? "Sin notas",
          date: formatDateTime(a.approved_at),
        };
      }
    }

    const rows = (invoices ?? []).map((r) => ({
      "Número Factura": r.invoice_number,
      Proveedor: r.supplier_name,
      NIT: r.supplier_nit,
      "Monto (COP)": Number(r.total_amount),
      "Fecha Emisión": formatDate(r.issue_date),
      "Fecha Recepción": formatDateTime(r.received_at),
      "Fecha Rechazo": formatDateTime(r.completed_at),
      "Rechazado por": approvalDetails[r.invoice_number]?.approver ?? "—",
      "Motivo / Notas": approvalDetails[r.invoice_number]?.notes ?? "—",
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "Rechazadas");
  }

  else if (reporte === "aprobadores") {
    let q = supabase
      .from("approvals")
      .select(
        "status, approved_at, notes, approvers(name, email), invoices(invoice_number, supplier_name, supplier_nit, total_amount, received_at)",
      )
      .order("approved_at", { ascending: false });

    if (fromIso || toIso) {
      q = applyDateFilter(q, fromIso, toIso, "approved_at");
    }

    const { data } = await q;

    const statusLabel: Record<string, string> = {
      approved: "Aprobada",
      rejected: "Rechazada",
      pending: "Pendiente",
    };

    const rows = (data ?? []).map((r) => {
      const inv = r.invoices as {
        invoice_number: string;
        supplier_name: string;
        supplier_nit: string;
        total_amount: number;
        received_at: string;
      } | null;
      const apr = r.approvers as { name: string; email: string } | null;
      return {
        Aprobador: apr?.name ?? "—",
        "Email Aprobador": apr?.email ?? "—",
        "Número Factura": inv?.invoice_number ?? "—",
        Proveedor: inv?.supplier_name ?? "—",
        NIT: inv?.supplier_nit ?? "—",
        "Monto (COP)": Number(inv?.total_amount ?? 0),
        "Fecha Recepción Factura": formatDateTime(inv?.received_at ?? null),
        Decisión: statusLabel[r.status ?? "pending"] ?? r.status ?? "—",
        "Fecha Decisión": formatDateTime(r.approved_at),
        Notas: r.notes ?? "",
      };
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "Actividad Aprobadores");
  }

  else {
    // reporte === "completo" — libro maestro con 2 hojas
    let invQ = supabase
      .from("invoices")
      .select(
        "id, invoice_number, supplier_name, supplier_nit, total_amount, currency, issue_date, due_date, received_at, completed_at, status, current_approvals, required_approvals, description",
      )
      .order("received_at", { ascending: false });
    invQ = applyDateFilter(invQ, fromIso, toIso);
    const { data: invoices } = await invQ;

    const statusLabel: Record<string, string> = {
      approved: "Aprobada",
      rejected: "Rechazada",
      pending: "Pendiente",
    };

    const invRows = (invoices ?? []).map((r) => ({
      "Número Factura": r.invoice_number,
      Proveedor: r.supplier_name,
      NIT: r.supplier_nit,
      "Monto (COP)": Number(r.total_amount),
      Moneda: r.currency ?? "COP",
      Estado: statusLabel[r.status ?? "pending"] ?? r.status ?? "—",
      "Fecha Emisión": formatDate(r.issue_date),
      "Fecha Vencimiento": formatDate(r.due_date),
      "Fecha Recepción": formatDateTime(r.received_at),
      "Fecha Completada": formatDateTime(r.completed_at),
      "Aprobaciones": `${r.current_approvals}/${r.required_approvals}`,
      Descripción: r.description ?? "",
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(invRows), "Facturas");

    // Hoja de aprobaciones
    const { data: approvals } = await supabase
      .from("approvals")
      .select(
        "status, approved_at, notes, approvers(name, email), invoices(invoice_number, supplier_name, total_amount)",
      )
      .order("approved_at", { ascending: false });

    const aprRows = (approvals ?? []).map((a) => {
      const inv = a.invoices as {
        invoice_number: string;
        supplier_name: string;
        total_amount: number;
      } | null;
      const apr = a.approvers as { name: string; email: string } | null;
      return {
        "Número Factura": inv?.invoice_number ?? "—",
        Proveedor: inv?.supplier_name ?? "—",
        "Monto (COP)": Number(inv?.total_amount ?? 0),
        Aprobador: apr?.name ?? "—",
        "Email Aprobador": apr?.email ?? "—",
        Decisión: statusLabel[a.status ?? "pending"] ?? a.status ?? "—",
        "Fecha Decisión": formatDateTime(a.approved_at),
        Notas: a.notes ?? "",
      };
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(aprRows), "Aprobaciones");
  }

  const reportNames: Record<string, string> = {
    aprobadas: "Facturas_Aprobadas",
    pendientes: "Facturas_Pendientes",
    rechazadas: "Facturas_Rechazadas",
    completo: "Libro_Completo_Facturas",
    aprobadores: "Actividad_Aprobadores",
  };

  const suffix = from || to ? `_${from ?? "inicio"}_${to ?? "hoy"}` : "";
  const filename = `${reportNames[reporte] ?? "Reporte"}${suffix}.xlsx`;

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(buf, {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
