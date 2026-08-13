-- Frente de negocio asignado a un usuario de Compras (parrilla|agropecuaria|ambos).
-- Permite que cada encargado de compras vea solo las facturas de su frente;
-- 'ambos' le da acceso a los dos frentes.
-- NULL = sin restriccion (admin y aprobadores).

ALTER TABLE public.approvers
  ADD COLUMN IF NOT EXISTS business_front text;

ALTER TABLE public.approvers
  DROP CONSTRAINT IF EXISTS approvers_business_front_check;

ALTER TABLE public.approvers
  ADD CONSTRAINT approvers_business_front_check
  CHECK (business_front IS NULL OR business_front IN ('parrilla','agropecuaria','ambos'));

COMMENT ON COLUMN public.approvers.business_front IS
  'Frente de negocio asignado al usuario de Compras (parrilla|agropecuaria|ambos). NULL = sin restriccion (admin/aprobadores).';
