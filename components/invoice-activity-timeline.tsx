import { History } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { activityMeta } from "@/components/activity-meta";

const ROLE_LABEL: Record<string, string> = {
  admin: "Administrador",
  purchasing: "Compras",
  approver: "Aprobador",
};

// Convierte el JSON de "details" en una nota legible para mostrar bajo el evento.
function describeDetails(details: unknown): string | null {
  if (!details || typeof details !== "object") return null;
  const d = details as Record<string, unknown>;
  const parts: string[] = [];

  if (typeof d.notes === "string" && d.notes.trim()) {
    parts.push(`Nota: ${d.notes.trim()}`);
  }
  if (typeof d.review_notes === "string" && d.review_notes.trim()) {
    parts.push(`Nota: ${d.review_notes.trim()}`);
  }
  if (typeof d.reason === "string" && d.reason.trim()) {
    parts.push(`Motivo: ${d.reason.trim()}`);
  }
  if (typeof d.approval_mode === "string") {
    parts.push(
      d.approval_mode === "sequential" ? "Modo en cadena" : "Modo en paralelo",
    );
  }
  if (typeof d.approvers === "number") {
    parts.push(`${d.approvers} aprobador${d.approvers === 1 ? "" : "es"}`);
  }
  return parts.length ? parts.join(" · ") : null;
}

export async function InvoiceActivityTimeline({
  invoiceId,
}: {
  invoiceId: string;
}) {
  const supabase = await createClient();
  const { data: events } = await supabase
    .from("invoice_activity_log")
    .select("id, action, actor_name, actor_role, details, created_at")
    .eq("invoice_id", invoiceId)
    .order("created_at", { ascending: false });

  const rows = events ?? [];

  return (
    <section className="surface p-4 sm:p-5">
      <div className="mb-4 flex items-center gap-2">
        <History className="size-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold text-neutral-900">
          Historial de actividad
        </h2>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Aún no hay actividad registrada para esta factura.
        </p>
      ) : (
        <ol className="relative space-y-4">
          {rows.map((ev, i) => {
            const meta = activityMeta(ev.action);
            const Icon = meta.Icon;
            const note = describeDetails(ev.details);
            const isLast = i === rows.length - 1;
            return (
              <li key={ev.id} className="relative flex gap-3">
                {/* Línea vertical conectora */}
                {!isLast ? (
                  <span
                    className="absolute left-[15px] top-8 bottom-[-16px] w-px bg-neutral-200"
                    aria-hidden
                  />
                ) : null}
                <span
                  className={cn(
                    "z-10 flex size-8 shrink-0 items-center justify-center rounded-full ring-1 ring-inset [&_svg]:size-4",
                    meta.dotClassName,
                  )}
                >
                  <Icon />
                </span>
                <div className="min-w-0 flex-1 pb-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-2">
                    <span className="text-sm font-medium text-neutral-900">
                      {meta.label}
                    </span>
                    <time className="text-xs text-muted-foreground tabular-nums">
                      {formatDateTime(ev.created_at)}
                    </time>
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    {ev.actor_name ?? "Sistema"}
                    {ev.actor_role
                      ? ` · ${ROLE_LABEL[ev.actor_role] ?? ev.actor_role}`
                      : ""}
                  </div>
                  {note ? (
                    <p className="mt-1 rounded-md bg-neutral-50 px-2.5 py-1.5 text-xs text-neutral-700">
                      {note}
                    </p>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
