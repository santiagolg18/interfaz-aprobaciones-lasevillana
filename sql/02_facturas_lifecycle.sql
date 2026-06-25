-- ============================================================
-- Migración: ciclo de vida de facturas (estados archivada / completada)
-- Ejecutar UNA VEZ sobre el esquema de 01_schema.sql.
-- ============================================================
--
-- Estados nuevos de invoices.status (VARCHAR(20), sin enum):
--   'archived'  = registrada pero NO requiere revisión ni aprobación.
--                 Acción manual del encargado, reversible (desarchivar -> in_review).
--   'completed' = aprobada, impresa y ENTREGADA a contabilidad. Reversible
--                 (revertir -> approved). Se distingue de 'approved' (lista para
--                 imprimir, aún no entregada).
--
-- NOTA: 'completed_at' NO se reutiliza: ya significa "fecha de decisión final"
-- (la setean el trigger check_invoice_completion y configureInvoiceApprovers).
-- La entrega a contabilidad usa la nueva 'sent_to_accounting_at'.
-- ============================================================

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS archived_at            TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS archived_by            UUID REFERENCES approvers(id),
  ADD COLUMN IF NOT EXISTS sent_to_accounting_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sent_to_accounting_by  UUID REFERENCES approvers(id);

COMMENT ON COLUMN invoices.archived_at IS
  'Cuándo se archivó (no requiere flujo). NULL = no archivada.';
COMMENT ON COLUMN invoices.sent_to_accounting_at IS
  'Cuándo se marcó como entregada a contabilidad (status=completed).';
