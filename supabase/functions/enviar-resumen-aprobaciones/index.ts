import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const APP_URL = "https://interfaz-aprobaciones-lasevillana.vercel.app/mis-aprobaciones";
const FROM = "La Sevillana <facturacionagropecuaria@lasevillana.com.co>";
const RESEND_ENDPOINT = "https://api.resend.com/emails";

type Invoice = {
  id: string;
  invoice_number: string;
  supplier_name: string;
  supplier_nit: string | null;
  total_amount: number;
  received_at: string;
};

type Pending = { createdAt: string; invoice: Invoice };

const cop = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

function buildHtml(name: string, items: Pending[]): string {
  const now = Date.now();
  const rows = items
    .map((p) => {
      const i = p.invoice;
      const days = (now - new Date(p.createdAt).getTime()) / 86400000;
      const urgent = days >= 7;
      const nit = i.supplier_nit ? ` (NIT: ${i.supplier_nit})` : "";
      return `<tr>
        <td style="padding:10px;border:1px solid #e5e7eb;">${i.supplier_name}${nit}</td>
        <td style="padding:10px;border:1px solid #e5e7eb;white-space:nowrap;">${i.invoice_number}${
          urgent
            ? ` <span style="display:inline-block;margin-left:6px;background:#fee2e2;color:#b91c1c;font-size:11px;font-weight:700;padding:2px 6px;border-radius:6px;">+7 días</span>`
            : ""
        }</td>
        <td style="padding:10px;border:1px solid #e5e7eb;text-align:right;white-space:nowrap;font-weight:600;">${cop.format(
          Number(i.total_amount),
        )}</td>
      </tr>`;
    })
    .join("");

  const count = items.length;
  const plural = count === 1 ? "factura pendiente" : "facturas pendientes";

  return `<div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;color:#1f2937;">
    <h2 style="color:#111111;margin:0 0 4px;">Facturas pendientes por aprobar</h2>
    <p style="margin:0 0 16px;color:#4b5563;">Hola ${name}, tienes <strong>${count} ${plural}</strong> esperando tu aprobación.</p>
    <table style="width:100%;border-collapse:collapse;margin:0 0 24px;font-size:14px;">
      <thead>
        <tr style="background:#f9fafb;">
          <th style="padding:10px;border:1px solid #e5e7eb;text-align:left;">Proveedor</th>
          <th style="padding:10px;border:1px solid #e5e7eb;text-align:left;">Factura N°</th>
          <th style="padding:10px;border:1px solid #e5e7eb;text-align:right;">Monto</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <div style="text-align:center;margin:8px 0 28px;">
      <a href="${APP_URL}" target="_blank" style="display:inline-block;background:#16a34a;color:#ffffff;padding:14px 28px;text-decoration:none;border-radius:8px;font-weight:bold;font-size:15px;">Abrir app y aprobar</a>
    </div>
    <p style="margin:0;color:#9ca3af;font-size:12px;">Este es un recordatorio automático de La Sevillana. Recibes este correo a las 7:00 a.m. y 2:00 p.m. mientras tengas facturas pendientes.</p>
  </div>`;
}

Deno.serve(async (req: Request) => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  // Autenticación por secreto compartido (la función se despliega sin verify_jwt).
  const { data: expectedSecret } = await supabase.rpc("get_vault_secret", {
    secret_name: "cron_secret",
  });
  const provided = req.headers.get("x-cron-secret");
  if (!expectedSecret || provided !== expectedSecret) {
    return new Response(JSON.stringify({ error: "No autorizado" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Parámetros opcionales de prueba (solo activos si se envían en el body):
  //  test_to:       fuerza el destinatario de todos los correos
  //  from_override: usa otro remitente (ej. onboarding@resend.dev mientras no esté verificado el dominio)
  //  only_email:    envía solo el del aprobador con ese correo
  let testTo: string | null = null;
  let fromOverride: string | null = null;
  let onlyEmail: string | null = null;
  try {
    const body = await req.json();
    if (body && typeof body.test_to === "string") testTo = body.test_to;
    if (body && typeof body.from_override === "string") fromOverride = body.from_override;
    if (body && typeof body.only_email === "string") onlyEmail = body.only_email;
  } catch (_) {
    // sin body, flujo normal
  }
  const fromAddress = fromOverride ?? FROM;

  const { data: resendKey } = await supabase.rpc("get_vault_secret", {
    secret_name: "resend_api_key",
  });
  if (!resendKey) {
    return new Response(JSON.stringify({ error: "Falta resend_api_key en Vault" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { data, error } = await supabase
    .from("approvals")
    .select(
      "created_at, approver:approvers!inner(id,name,email,is_active), invoice:invoices!inner(id,invoice_number,supplier_name,supplier_nit,total_amount,received_at)",
    )
    .eq("status", "pending")
    .eq("approver.is_active", true);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Agrupar pendientes por aprobador.
  const byApprover = new Map<
    string,
    { name: string; email: string; items: Pending[] }
  >();
  for (const row of (data ?? []) as any[]) {
    const ap = Array.isArray(row.approver) ? row.approver[0] : row.approver;
    const inv = Array.isArray(row.invoice) ? row.invoice[0] : row.invoice;
    if (!ap || !inv || !ap.email) continue;
    if (!byApprover.has(ap.id)) {
      byApprover.set(ap.id, { name: ap.name ?? "", email: ap.email, items: [] });
    }
    byApprover.get(ap.id)!.items.push({ createdAt: row.created_at, invoice: inv });
  }

  const results: { email: string; status: string; detail?: string }[] = [];
  let sent = 0;

  for (const { name, email, items } of byApprover.values()) {
    if (items.length === 0) continue;
    if (onlyEmail && email !== onlyEmail) continue;
    items.sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
    const to = testTo ?? email;
    const subject = `Tienes ${items.length} ${
      items.length === 1 ? "factura pendiente" : "facturas pendientes"
    } por aprobar`;

    const resp = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: fromAddress, to: [to], subject, html: buildHtml(name, items) }),
    });

    if (resp.ok) {
      sent++;
      results.push({ email: to, status: "enviado" });
    } else {
      const detail = await resp.text();
      results.push({ email: to, status: "error", detail });
    }
  }

  return new Response(
    JSON.stringify({ approvers_with_pending: byApprover.size, sent, results }),
    { headers: { "Content-Type": "application/json" } },
  );
});
