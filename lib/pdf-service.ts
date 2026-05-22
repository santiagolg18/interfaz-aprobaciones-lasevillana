import { createAdminClient } from "@/lib/supabase/admin";

const TIMEOUT_MS = 15_000;
const RETRY_DELAY_MS = 1_000;

type GenerationOutcome =
  | { ok: true }
  | { ok: false; error: string };

async function callPdfService(
  url: string,
  invoiceId: string,
): Promise<GenerationOutcome> {
  try {
    const res = await fetch(`${url}/generate-final-pdf`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ invoice_id: invoiceId }),
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      return { ok: false, error: `HTTP ${res.status}: ${detail || res.statusText}` };
    }
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: message };
  }
}

async function persistOutcome(
  invoiceId: string,
  outcome: GenerationOutcome,
): Promise<void> {
  try {
    const admin = createAdminClient();
    await admin
      .from("invoices")
      .update({
        pdf_generation_status: outcome.ok ? "ok" : "error",
        pdf_generation_error: outcome.ok ? null : outcome.error.slice(0, 2000),
        pdf_generation_attempted_at: new Date().toISOString(),
      })
      .eq("id", invoiceId);
  } catch (err) {
    console.error("pdf-service: failed to persist outcome", err);
  }
}

/**
 * Dispara la generación del PDF aprobado en el servicio externo.
 * Hace timeout de 15s y 1 reintento. Persiste el resultado en
 * invoices.pdf_generation_status / error / attempted_at. Nunca lanza.
 */
export async function triggerPdfGeneration(invoiceId: string): Promise<void> {
  const url = process.env.PDF_SERVICE_URL;
  if (!url) {
    console.warn("PDF_SERVICE_URL no configurada; se omite generación del PDF aprobado");
    await persistOutcome(invoiceId, {
      ok: false,
      error: "PDF_SERVICE_URL not configured",
    });
    return;
  }

  let outcome = await callPdfService(url, invoiceId);
  if (!outcome.ok) {
    console.warn(`pdf-service attempt 1 failed for ${invoiceId}: ${outcome.error}`);
    await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
    outcome = await callPdfService(url, invoiceId);
    if (!outcome.ok) {
      console.error(`pdf-service attempt 2 failed for ${invoiceId}: ${outcome.error}`);
    }
  }

  await persistOutcome(invoiceId, outcome);
}
