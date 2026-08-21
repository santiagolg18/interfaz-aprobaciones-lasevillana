-- ============================================================
-- Migración: borrador de la revisión de compras
-- Aplicada vía MCP de Supabase (apply_migration: review_draft).
-- Esta copia queda versionada en el repo. Ejecutar UNA VEZ.
-- ============================================================
--
-- La revisión de compras (checklist + observaciones) ya se guardaba en
-- invoices.review_checklist / invoices.review_notes, pero SOLO al liberar la
-- factura o marcarla con problema. Ahora Compras puede guardar avances
-- parciales (autosave + botón "Guardar borrador") sin cambiar el estado de la
-- factura. Estas dos columnas registran cuándo y quién guardó el último
-- borrador, para mostrar "Guardado hace X por Y" y marcar en la lista las
-- facturas cuya revisión ya está empezada.
-- ============================================================

alter table invoices
  add column if not exists review_draft_saved_at timestamptz,
  add column if not exists review_draft_by uuid references approvers(id);

comment on column invoices.review_draft_saved_at is
  'Última vez que Compras guardó la revisión como borrador (sin liberar la factura). NULL = sin avance.';

comment on column invoices.review_draft_by is
  'Quién guardó el último borrador de la revisión de compras.';
