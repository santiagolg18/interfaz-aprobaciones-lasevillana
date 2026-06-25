-- ============================================================
-- Migración: registro de actividad / auditoría de facturas
-- Aplicada vía MCP de Supabase (apply_migration: invoice_activity_log).
-- Esta copia queda versionada en el repo. Ejecutar UNA VEZ.
-- ============================================================
--
-- Tabla auto-contenida: guarda un snapshot de los datos clave de la factura
-- (número, proveedor, monto) para que el registro SOBREVIVA al borrado
-- PERMANENTE de la factura. Por eso invoice_id usa ON DELETE SET NULL
-- (NO cascade): al eliminar una factura, el log conserva la entrada con
-- invoice_id = NULL pero mantiene el snapshot y el motivo.
-- ============================================================

create table if not exists invoice_activity_log (
  id             uuid primary key default gen_random_uuid(),
  invoice_id     uuid references invoices(id) on delete set null,
  invoice_number text,          -- snapshot
  supplier_name  text,          -- snapshot
  total_amount   numeric,       -- snapshot
  action         text not null, -- created, review_released, review_rejected, approved,
                                 -- rejected, archived, unarchived, sent_to_accounting,
                                 -- reverted_to_print, po_uploaded, po_deleted,
                                 -- approvers_configured, deleted
  actor_id       uuid references approvers(id),
  actor_name     text,          -- snapshot (por si el aprobador se desactiva)
  actor_role     text,
  details        jsonb,         -- notas, motivo, snapshot completo en 'deleted', etc.
  created_at     timestamptz not null default now()
);

create index if not exists idx_invoice_activity_log_invoice
  on invoice_activity_log (invoice_id, created_at desc);
create index if not exists idx_invoice_activity_log_created
  on invoice_activity_log (created_at desc);
create index if not exists idx_invoice_activity_log_action
  on invoice_activity_log (action);

comment on table invoice_activity_log is
  'Historial de acciones sobre facturas (auditoría). Guarda snapshot de número/proveedor/monto para que el registro sobreviva al borrado permanente de la factura.';

-- RLS consistente con el resto del esquema: acceso para usuarios autenticados.
-- El control de permisos real (quién puede archivar/eliminar) se hace en las
-- server actions; la tabla solo se escribe con el service-role (admin client).
alter table invoice_activity_log enable row level security;

create policy auth_all_invoice_activity_log
  on invoice_activity_log
  for all
  to authenticated
  using (true)
  with check (true);
